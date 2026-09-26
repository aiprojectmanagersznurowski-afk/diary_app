import { LlmProvider, EmbeddingProvider, LlmMessage, LlmGenerateOptions, AiProviderName } from './types.ts';
import { fetchWithRetry, FetchFn } from './retry.ts';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiLlmAdapter implements LlmProvider {
  readonly providerName: AiProviderName = 'gemini';
  readonly model: string;
  private apiKey: string;
  private fetchFn?: FetchFn;

  constructor(apiKey: string, model: string = 'gemini-2.0-flash', fetchFn?: FetchFn) {
    if (!apiKey) {
      throw new Error('Brak klucza API dla Gemini (wymagany GEMINI_API_KEY)');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.fetchFn = fetchFn;
  }

  private mapMessages(messages: LlmMessage[]): {
    systemInstruction?: { parts: { text: string }[] };
    contents: { role: string; parts: { text: string }[] }[];
  } {
    const systemParts: string[] = [];
    const contents: { role: string; parts: { text: string }[] }[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push(msg.content);
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    return {
      systemInstruction: systemParts.length > 0 ? { parts: systemParts.map((t) => ({ text: t })) } : undefined,
      contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: '' }] }],
    };
  }

  async generateText(messages: LlmMessage[], options?: LlmGenerateOptions): Promise<string> {
    const { systemInstruction, contents } = this.mapMessages(messages);

    const generationConfig: Record<string, unknown> = {};
    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }
    if (options?.responseFormat === 'json') {
      generationConfig.responseMimeType = 'application/json';
    }

    const payload: Record<string, unknown> = {
      contents,
      generationConfig,
    };
    if (systemInstruction) {
      payload.systemInstruction = systemInstruction;
    }

    const url = `${GEMINI_API_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { fetchFn: this.fetchFn },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Błąd Gemini LLM (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;
    return textPart || '';
  }

  async generateJson<T = unknown>(messages: LlmMessage[], options?: LlmGenerateOptions): Promise<T> {
    const raw = await this.generateText(messages, {
      ...options,
      responseFormat: 'json',
    });

    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      throw new Error(`Odpowiedź Gemini nie jest poprawnym formatem JSON: ${raw} (błąd: ${String(err)})`);
    }
  }

  async *streamText(messages: LlmMessage[], options?: LlmGenerateOptions): AsyncIterable<string> {
    const { systemInstruction, contents } = this.mapMessages(messages);

    const generationConfig: Record<string, unknown> = {};
    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }

    const payload: Record<string, unknown> = {
      contents,
      generationConfig,
    };
    if (systemInstruction) {
      payload.systemInstruction = systemInstruction;
    }

    const url = `${GEMINI_API_BASE}/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { fetchFn: this.fetchFn },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Błąd Gemini LLM Stream (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Brak strumienia odpowiedzi w Gemini LLM Stream');
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

        try {
          const parsed = JSON.parse(dataStr);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            yield text;
          }
        } catch {
          // Ignoruj uszkodzone chunki SSE
        }
      }
    }
  }
}

export class GeminiEmbeddingAdapter implements EmbeddingProvider {
  readonly providerName: AiProviderName = 'gemini';
  readonly model: string;
  readonly dimension: number;
  private apiKey: string;
  private fetchFn?: FetchFn;

  constructor(apiKey: string, model: string = 'gemini-embedding-001', dimension: number = 1536, fetchFn?: FetchFn) {
    if (!apiKey) {
      throw new Error('Brak klucza API dla Gemini Embedding (wymagany GEMINI_API_KEY)');
    }
    this.apiKey = apiKey;
    this.model = model;
    this.dimension = dimension;
    this.fetchFn = fetchFn;
  }

  async embed(text: string): Promise<number[]> {
    const url = `${GEMINI_API_BASE}/models/${this.model}:embedContent?key=${this.apiKey}`;
    const payload = {
      content: {
        parts: [{ text }],
      },
      outputDimensionality: this.dimension,
    };

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      { fetchFn: this.fetchFn },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Błąd Gemini Embedding (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const values: number[] | undefined = data.embedding?.values;

    if (!values || values.length !== this.dimension) {
      throw new Error(`Niezgodność wymiaru embeddingu: oczekiwano ${this.dimension}, otrzymano ${values?.length ?? 0}`);
    }

    return values;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const url = `${GEMINI_API_BASE}/models/${this.model}:batchEmbedContents?key=${this.apiKey}`;
    const requests = texts.map((text) => ({
      model: `models/${this.model}`,
      content: {
        parts: [{ text }],
      },
      outputDimensionality: this.dimension,
    }));

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      },
      { fetchFn: this.fetchFn },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Błąd Gemini Batch Embedding (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const embeddings: { values: number[] }[] = data.embeddings || [];

    return embeddings.map((emb, idx) => {
      if (!emb?.values || emb.values.length !== this.dimension) {
        throw new Error(
          `Niezgodność wymiaru embeddingu dla indeksu ${idx}: oczekiwano ${this.dimension}, otrzymano ${emb?.values?.length ?? 0}`,
        );
      }
      return emb.values;
    });
  }
}
