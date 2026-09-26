import { SttProvider, LlmProvider, EmbeddingProvider } from './types.ts';
import { GroqSttAdapter, GroqLlmAdapter } from './groq.ts';
import { GeminiLlmAdapter, GeminiEmbeddingAdapter } from './gemini.ts';
import { getAiConfig, AiSystemConfig } from '../config/aiConfig.ts';
import { FetchFn } from './retry.ts';

export function createSttProvider(config: AiSystemConfig = getAiConfig(), fetchFn?: FetchFn): SttProvider {
  const { provider, model } = config.stt;

  if (provider === 'groq') {
    const key = config.groqApiKey || '';
    return new GroqSttAdapter(key, model, fetchFn);
  }

  throw new Error(`Nieobsługiwany dostawca STT: ${provider}. Obsługiwany: 'groq'.`);
}

export function createLlmProvider(
  task: 'structure' | 'digest' | 'link' | 'chat',
  config: AiSystemConfig = getAiConfig(),
  fetchFn?: FetchFn,
): LlmProvider {
  const taskConfig = config[task];
  const { provider, model } = taskConfig;

  if (provider === 'groq') {
    const key = config.groqApiKey || '';
    return new GroqLlmAdapter(key, model, fetchFn);
  }

  if (provider === 'gemini') {
    const key = config.geminiApiKey || '';
    return new GeminiLlmAdapter(key, model, fetchFn);
  }

  throw new Error(`Nieobsługiwany dostawca LLM (${provider}) dla zadania ${task}. Dostępni: 'groq', 'gemini'.`);
}

export function createEmbeddingProvider(config: AiSystemConfig = getAiConfig(), fetchFn?: FetchFn): EmbeddingProvider {
  const { provider, model, dimension } = config.embedding;

  if (provider === 'gemini') {
    const key = config.geminiApiKey || '';
    return new GeminiEmbeddingAdapter(key, model, dimension, fetchFn);
  }

  throw new Error(
    `Nieobsługiwany dostawca embeddingów: ${provider}. Groq nie oferuje embeddingów, wymagany: 'gemini'.`,
  );
}

export interface AiProviders {
  stt: SttProvider;
  structure: LlmProvider;
  digest: LlmProvider;
  link: LlmProvider;
  chat: LlmProvider;
  embedding: EmbeddingProvider;
}

export function createAiProviders(envOverrides?: Record<string, string | undefined>, fetchFn?: FetchFn): AiProviders {
  const config = getAiConfig(envOverrides);
  return {
    stt: createSttProvider(config, fetchFn),
    structure: createLlmProvider('structure', config, fetchFn),
    digest: createLlmProvider('digest', config, fetchFn),
    link: createLlmProvider('link', config, fetchFn),
    chat: createLlmProvider('chat', config, fetchFn),
    embedding: createEmbeddingProvider(config, fetchFn),
  };
}
