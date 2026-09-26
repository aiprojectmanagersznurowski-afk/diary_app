export type AiTask = 'stt' | 'structure' | 'digest' | 'link' | 'chat' | 'embedding';

export type AiProviderName = 'groq' | 'gemini';

export interface SttOptions {
  language?: string; // Domyślnie 'pl'
  prompt?: string;
}

export interface SttProvider {
  readonly providerName: AiProviderName;
  readonly model: string;
  transcribe(audioData: Blob | Uint8Array, options?: SttOptions): Promise<string>;
}

export type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmGenerateOptions {
  temperature?: number;
  responseFormat?: 'text' | 'json';
  maxTokens?: number;
}

export interface LlmProvider {
  readonly providerName: AiProviderName;
  readonly model: string;
  generateText(messages: LlmMessage[], options?: LlmGenerateOptions): Promise<string>;
  generateJson<T = unknown>(messages: LlmMessage[], options?: LlmGenerateOptions): Promise<T>;
  streamText(messages: LlmMessage[], options?: LlmGenerateOptions): AsyncIterable<string>;
}

export interface EmbeddingProvider {
  readonly providerName: AiProviderName;
  readonly model: string;
  readonly dimension: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
