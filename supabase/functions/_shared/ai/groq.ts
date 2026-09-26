import { SttProvider, LlmProvider, SttOptions, LlmMessage, LlmGenerateOptions, AiProviderName } from './types.ts';
import { fetchWithRetry, FetchFn } from './retry.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1';

export class GroqSttAdapter implements SttProvider {
  readonly providerName: AiProviderName = 'groq';
  readonly model: string;
  private apiKey: string;
  private fetchFn?: FetchFn;

  constructor(apiKey: string, model: string = 'whisper-large-v3', fetchFn?: FetchFn) {
    if (!apiKey) {
      throw new Error('Brak klucza API dla Groq (wymagany GROQ_API_KEY)');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.fetchFn = fetchFn;
  }

  async transcribe(audioData: Blob | Uint8Array, options?: SttOptions): Promise<string> {
    const formData = new FormData();
    const blob =
      audioData instanceof Blob ? audioData : new Blob([audioData.buffer as ArrayBuffer], { type: 'audio/m4a' });
    formData.append('file', blob, 'audio.m4a');
    formData.append('model', this.model);
    formData.append('language', options?.language ?? 'pl');
    formData.append('response_format', 'json');

    if (options?.prompt) {
      formData.append('prompt', options.prompt);
    }

    const response = await fetchWithRetry(
      `${GROQ_API_URL}/audio/transcriptions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      },
      { fetchFn: this.fetchFn },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Błąd Groq STT (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return (data.text || '').trim();
  }
}

export class GroqLlmAdapter implements LlmProvider {
  readonly providerName: AiProviderName = 'groq';
  readonly model: string;
  private apiKey: string;
  private fetchFn?: FetchFn;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile', fetchFn?: FetchFn) {
    if (!apiKey) {
      throw new Error('Brak klucza API dla Groq (wymagany GROQ_API_KEY)');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.fetchFn = fetchFn;
  }

  async generateText(messages: LlmMessage[], options?: LlmGenerateOptions): Promise<string> {
    const payload: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
    };

    if (options?.maxTokens) {
      payload.max_tokens = options.maxTokens;
    }

    if (options?.responseFormat === 'json') {
      payload.response_format = { type: 'json_object' };
    }

    const response = await fetchWithRetry(
      `${GROQ_API_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      { fetchFn: this.fetchFn },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Błąd Groq LLM (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async generateJson<T = unknown>(messages: LlmMessage[], options?: LlmGenerateOptions): Promise<T> {
    const raw = await this.generateText(messages, {
      ...options,
      responseFormat: 'json',
    });

    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      throw new Error(`Odpowiedź Groq nie jest poprawnym formatem JSON: ${raw} (błąd: ${String(err)})`);
    }
  }

  async *streamText(messages: LlmMessage[], options?: LlmGenerateOptions): AsyncIterable<string> {
    const payload: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      stream: true,
    };

    if (options?.maxTokens) {
      payload.max_tokens = options.maxTokens;
    }

    const response = await fetchWithRetry(
      `${GROQ_API_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      { fetchFn: this.fetchFn },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Błąd Groq LLM Stream (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Brak strumienia odpowiedzi w Groq LLM Stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') return;

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            yield delta;
          }
        } catch {
          // Ignoruj uszkodzone chunki SSE
        }
      }
    }
  }
}
