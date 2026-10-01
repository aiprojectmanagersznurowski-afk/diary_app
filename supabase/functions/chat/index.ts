import { createAiProviders, AiProviders } from '../_shared/ai/factory.ts';
import { LlmMessage } from '../_shared/ai/types.ts';
import { createChatDatabaseClient } from './dbClient.ts';
import { rewriteChatQuery, getCurrentDateInTimezone } from './queryRewrite.ts';
import { extractCitations, formatContextFromChunks } from './citations.ts';
import { IChatDatabaseClient, ChatRequestBody, ChatStreamEvent } from './types.ts';

export interface HandlerDependencies {
  dbClientFactory?: (authHeader?: string) => IChatDatabaseClient;
  aiProvidersFactory?: () => AiProviders;
  rewritePromptTemplate?: string;
  answerPromptTemplate?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

let answerPromptCache: string | null = null;

export async function loadAnswerPromptTemplate(): Promise<string> {
  if (answerPromptCache) return answerPromptCache;
  const path = new URL('../_shared/prompts/chat-answer.v1.md', import.meta.url);
  const raw = await Deno.readTextFile(path);
  const match = raw.match(/^---[\s\S]*?---\n?([\s\S]*)$/);
  const content = (match ? match[1] : raw).trim();
  answerPromptCache = content;
  return content;
}

export async function handleChatRequest(req: Request, deps?: HandlerDependencies): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metoda niedozwolona' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: ChatRequestBody;
  try {
    const raw = await req.json();
    body = raw as ChatRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Niepoprawny format JSON' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const message = body?.message;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return new Response(JSON.stringify({ error: 'Brak wymaganego pola message' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') || undefined;
  const db = deps?.dbClientFactory ? deps.dbClientFactory(authHeader) : createChatDatabaseClient(authHeader);
  const aiProviders = deps?.aiProvidersFactory ? deps.aiProvidersFactory() : createAiProviders();

  const userId = await db.getUserId(authHeader);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Brak autoryzacji' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Uruchomienie strumienia Server-Sent Events (SSE)
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (eventData: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
      };

      try {
        // 1. Ustalenie strefy czasowej i bieżącej daty
        let timezone = body.timezone;
        if (!timezone) {
          const profile = await db.getUserProfile(userId);
          timezone = profile?.timezone || 'Europe/Warsaw';
        }
        const currentDate = body.current_date || getCurrentDateInTimezone(timezone);

        // 2. Zarządzanie wątkiem i zapis pytania użytkownika
        const threadId = await db.getOrCreateThread(userId, body.thread_id, message);
        await db.saveMessage({
          threadId,
          userId,
          role: 'user',
          content: message,
          citations: [],
        });

        // 3. Przepisanie zapytania przez LLM (Query Rewriter)
        const rewrite = await rewriteChatQuery({
          message,
          llm: aiProviders.chat,
          currentDate,
          timezone,
          promptTemplate: deps?.rewritePromptTemplate,
        });

        // 4. Rozpoznanie kategorii, jeśli podano
        let categoryIds: string[] | null = null;
        if (rewrite.categories && rewrite.categories.length > 0) {
          const resolved = await db.resolveCategoryIds(userId, rewrite.categories);
          categoryIds = resolved.length > 0 ? resolved : null;
        }

        // 5. Wygenerowanie embeddingu dla zapytania wyszukiwania
        let queryEmbedding: number[] | null = null;
        const searchQuery = rewrite.search_query.trim();
        if (searchQuery) {
          queryEmbedding = await aiProviders.embedding.embed(searchQuery);
        }

        // 6. Wyszukiwanie hybrydowe (search_chunks)
        const chunks = await db.searchChunks(userId, {
          queryEmbedding,
          queryText: searchQuery || null,
          dateFrom: rewrite.date_from,
          dateTo: rewrite.date_to,
          kinds: rewrite.kinds,
          categoryIds,
          k: 10,
        });

        // 7. Przygotowanie kontekstu i promptu odpowiedzi RAG
        const contextText = formatContextFromChunks(chunks);
        const answerTemplate = deps?.answerPromptTemplate || (await loadAnswerPromptTemplate());
        const populatedPrompt = answerTemplate
          .replace('{{CONTEXT}}', contextText)
          .replace('{{USER_QUESTION}}', message);

        // 8. Strumieniowanie tokenów z LLM
        let fullAnswer = '';
        const messages: LlmMessage[] = [{ role: 'user', content: populatedPrompt }];

        for await (const token of aiProviders.chat.streamText(messages)) {
          fullAnswer += token;
          sendEvent({ type: 'token', content: token });
        }

        // 9. Ekstrakcja i weryfikacja cytatów
        const citations = extractCitations(fullAnswer, chunks);

        // 10. Zapis odpowiedzi asystenta w bazie danych
        const savedAssistantMsg = await db.saveMessage({
          threadId,
          userId,
          role: 'assistant',
          content: fullAnswer,
          citations,
        });

        // 11. Zakończenie strumienia ze zdarzeniem done
        sendEvent({
          type: 'done',
          thread_id: threadId,
          message_id: savedAssistantMsg.id,
          citations,
          content: fullAnswer,
        });

        controller.close();
      } catch (streamErr: unknown) {
        const errorMsg = streamErr instanceof Error ? streamErr.message : String(streamErr);
        sendEvent({ type: 'error', error: errorMsg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Supabase Edge Function runtime server
if (import.meta.main) {
  Deno.serve((req: Request) => handleChatRequest(req));
}
