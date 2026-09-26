import { createAiProviders, createLlmProvider, createEmbeddingProvider, createSttProvider } from './factory.ts';
import { getAiConfig } from '../config/aiConfig.ts';

Deno.test('Factory - domyślna konfiguracja tworzy właściwe adaptery i modele', () => {
  const env: Record<string, string> = {
    GROQ_API_KEY: 'test-groq-key',
    GEMINI_API_KEY: 'test-gemini-key',
  };

  const providers = createAiProviders(env);

  // STT: domyślnie Groq whisper-large-v3
  if (providers.stt.providerName !== 'groq' || providers.stt.model !== 'whisper-large-v3') {
    throw new Error(`Nieprawidłowy dostawca/model STT: ${providers.stt.providerName}, ${providers.stt.model}`);
  }

  // LLM: domyślnie Groq llama-3.3-70b-versatile
  if (providers.structure.providerName !== 'groq' || providers.structure.model !== 'llama-3.3-70b-versatile') {
    throw new Error(`Nieprawidłowy dostawca/model structure: ${providers.structure.providerName}`);
  }

  // Embedding: domyślnie Gemini z wymiarem 1536
  if (
    providers.embedding.providerName !== 'gemini' ||
    providers.embedding.model !== 'gemini-embedding-001' ||
    providers.embedding.dimension !== 1536
  ) {
    throw new Error(
      `Nieprawidłowy dostawca/wymiar embeddingu: ${providers.embedding.providerName}, ${providers.embedding.dimension}`,
    );
  }
});

Deno.test('Factory - zmiana dostawcy/modelu zadania wymaga tylko zmiany zmiennej środowiskowej', () => {
  const customEnv: Record<string, string> = {
    GROQ_API_KEY: 'test-groq-key',
    GEMINI_API_KEY: 'test-gemini-key',
    // Przełączamy czat na Gemini
    LLM_CHAT_PROVIDER: 'gemini',
    LLM_CHAT_MODEL: 'gemini-2.0-flash',
    // Zmieniamy model STT
    STT_MODEL: 'whisper-large-v3-turbo',
    // Zmieniamy wymiar i model embeddingów
    EMBED_MODEL: 'text-embedding-004',
    EMBED_DIM: '1536',
  };

  const config = getAiConfig(customEnv);

  const chatProvider = createLlmProvider('chat', config);
  if (chatProvider.providerName !== 'gemini' || chatProvider.model !== 'gemini-2.0-flash') {
    throw new Error(
      `Oczekiwano Gemini gemini-2.0-flash dla czatu po zmianie env, otrzymano: ${chatProvider.providerName} / ${chatProvider.model}`,
    );
  }

  const sttProvider = createSttProvider(config);
  if (sttProvider.model !== 'whisper-large-v3-turbo') {
    throw new Error(`Oczekiwano whisper-large-v3-turbo po zmianie env, otrzymano: ${sttProvider.model}`);
  }

  const embedProvider = createEmbeddingProvider(config);
  if (embedProvider.model !== 'text-embedding-004' || embedProvider.dimension !== 1536) {
    throw new Error(
      `Oczekiwano text-embedding-004 (dim 1536), otrzymano: ${embedProvider.model} (dim ${embedProvider.dimension})`,
    );
  }
});
