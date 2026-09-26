import { AiProviderName } from '../ai/types.ts';

export interface TaskConfig {
  provider: AiProviderName;
  model: string;
}

export interface EmbedConfig extends TaskConfig {
  dimension: number;
}

export interface AiSystemConfig {
  stt: TaskConfig;
  structure: TaskConfig;
  digest: TaskConfig;
  link: TaskConfig;
  chat: TaskConfig;
  embedding: EmbedConfig;
  groqApiKey?: string;
  geminiApiKey?: string;
}

/**
 * Odczytuje konfigurację AI ze zmiennych środowiskowych Deno.
 * Domyślne wartości odpowiadają specyfikacji w docs/03-stos-technologiczny.md.
 */
export function getAiConfig(env: Record<string, string | undefined> = getDenoEnv()): AiSystemConfig {
  const sttProvider = (env['STT_PROVIDER'] || 'groq').toLowerCase() as AiProviderName;
  const sttModel = env['STT_MODEL'] || (sttProvider === 'groq' ? 'whisper-large-v3' : 'whisper-large-v3');

  const structureProvider = (env['LLM_STRUCTURE_PROVIDER'] || 'groq').toLowerCase() as AiProviderName;
  const structureModel =
    env['LLM_STRUCTURE_MODEL'] || (structureProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-2.0-flash');

  const digestProvider = (env['LLM_DIGEST_PROVIDER'] || 'groq').toLowerCase() as AiProviderName;
  const digestModel =
    env['LLM_DIGEST_MODEL'] || (digestProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-2.0-flash');

  const linkProvider = (env['LLM_LINK_PROVIDER'] || 'groq').toLowerCase() as AiProviderName;
  const linkModel = env['LLM_LINK_MODEL'] || (linkProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-2.0-flash');

  const chatProvider = (env['LLM_CHAT_PROVIDER'] || 'groq').toLowerCase() as AiProviderName;
  const chatModel = env['LLM_CHAT_MODEL'] || (chatProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-2.0-flash');

  const embedProvider = (env['EMBED_PROVIDER'] || 'gemini').toLowerCase() as AiProviderName;
  const embedModel = env['EMBED_MODEL'] || 'gemini-embedding-001';
  const embedDim = parseInt(env['EMBED_DIM'] || '1536', 10);

  return {
    stt: { provider: sttProvider, model: sttModel },
    structure: { provider: structureProvider, model: structureModel },
    digest: { provider: digestProvider, model: digestModel },
    link: { provider: linkProvider, model: linkModel },
    chat: { provider: chatProvider, model: chatModel },
    embedding: { provider: embedProvider, model: embedModel, dimension: embedDim },
    groqApiKey: env['GROQ_API_KEY'],
    geminiApiKey: env['GEMINI_API_KEY'],
  };
}

function getDenoEnv(): Record<string, string | undefined> {
  if (typeof Deno !== 'undefined' && Deno.env) {
    return Deno.env.toObject();
  }
  return {};
}
