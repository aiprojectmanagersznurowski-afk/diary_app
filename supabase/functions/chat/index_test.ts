/* eslint-disable import/no-unresolved */
import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleChatRequest } from './index.ts';
import { rewriteChatQuery } from './queryRewrite.ts';
import { extractCitations, formatContextFromChunks } from './citations.ts';
import { IChatDatabaseClient, ChatSearchFilters, SearchChunkResult, Citation } from './types.ts';
import { AiProviders } from '../_shared/ai/factory.ts';
import { LlmProvider, EmbeddingProvider, SttProvider } from '../_shared/ai/types.ts';

class MockChatDb implements IChatDatabaseClient {
  public userId: string | null = 'user-test-123';
  public lastSearchFilters: ChatSearchFilters | null = null;
  public savedMessages: {
    threadId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
  }[] = [];
  public createdThreads: { userId: string; initialTitle?: string }[] = [];
  public chunksToReturn: SearchChunkResult[] = [
    {
      id: 'chunk-1',
      document_id: 'doc-note-1',
      content: 'Wczoraj wpadłem na genialny pomysł aplikacji Vocaly do nagrywania myśli.',
      idx: 0,
      day: '2026-09-30',
      kind: 'note',
      note_type: 'idea',
      title: 'Aplikacja Vocaly',
      slug: '2026-09-30-aplikacja-vocaly',
      category_id: 'cat-1',
      category_name: 'Projekty',
      category_color: '#3b82f6',
      similarity: 0.95,
    },
    {
      id: 'chunk-2',
      document_id: 'doc-note-2',
      content: 'Zrobiłem zakupy i zaplanowałem trening.',
      idx: 0,
      day: '2026-09-30',
      kind: 'note',
      note_type: 'task',
      title: 'Zadania codzienne',
      slug: '2026-09-30-zadania-codzienne',
      category_id: null,
      category_name: null,
      category_color: null,
      similarity: 0.8,
    },
  ];

  async getUserId(_authHeader?: string): Promise<string | null> {
    return this.userId;
  }

  async searchChunks(_userId: string, filters: ChatSearchFilters): Promise<SearchChunkResult[]> {
    this.lastSearchFilters = filters;
    return this.chunksToReturn;
  }

  async resolveCategoryIds(_userId: string, categoryNames: string[]): Promise<string[]> {
    if (categoryNames.includes('Projekty')) {
      return ['cat-1'];
    }
    return [];
  }

  async getOrCreateThread(userId: string, threadId?: string, initialTitle?: string): Promise<string> {
    if (threadId) {
      return threadId;
    }
    const newId = 'thread-new-1';
    this.createdThreads.push({ userId, initialTitle });
    return newId;
  }

  async saveMessage(params: {
    threadId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
  }): Promise<{ id: string; created_at: string }> {
    this.savedMessages.push(params);
    return {
      id: `msg-${this.savedMessages.length}`,
      created_at: new Date().toISOString(),
    };
  }

  async getUserProfile(_userId: string): Promise<{ timezone?: string } | null> {
    return { timezone: 'Europe/Warsaw' };
  }
}

function createMockAiProviders(options?: { rewriteResponse?: string; answerTokens?: string[] }): AiProviders {
  const defaultRewrite = JSON.stringify({
    search_query: 'pomysły aplikacja',
    date_from: '2026-09-30',
    date_to: '2026-09-30',
    kinds: ['idea'],
    categories: ['Projekty'],
  });

  const chatLlm: LlmProvider = {
    providerName: 'gemini',
    model: 'gemini-2.5-flash',
    async generateText() {
      return options?.rewriteResponse ?? defaultRewrite;
    },
    async generateJson<T>() {
      return JSON.parse(options?.rewriteResponse ?? defaultRewrite) as T;
    },
    async *streamText() {
      const tokens = options?.answerTokens ?? [
        'Wczoraj ',
        'zapisałeś ',
        'pomysł ',
        'na aplikację Vocaly ',
        '[doc:doc-note-1]. ',
        'To świetny pomysł!',
      ];
      for (const token of tokens) {
        yield token;
      }
    },
  };

  const dummyLlm: LlmProvider = {
    providerName: 'groq',
    model: 'dummy',
    async generateText() {
      return '';
    },
    async generateJson<T>() {
      return {} as T;
    },
    async *streamText() {
      yield '';
    },
  };

  const embedding: EmbeddingProvider = {
    providerName: 'gemini',
    model: 'text-embedding-004',
    dimension: 8,
    async embed() {
      return [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    },
    async embedBatch(texts: string[]) {
      return texts.map(() => [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
    },
  };

  const stt: SttProvider = {
    providerName: 'groq',
    model: 'whisper-large-v3',
    async transcribe() {
      return '';
    },
  };

  return {
    stt,
    structure: dummyLlm,
    digest: dummyLlm,
    link: dummyLlm,
    chat: chatLlm,
    embedding,
  };
}

async function readSseEvents(res: Response): Promise<Record<string, unknown>[]> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let done = false;
  let accumulated = '';

  while (!done) {
    const { value, done: isDone } = await reader.read();
    if (value) {
      accumulated += decoder.decode(value);
    }
    done = isDone;
  }

  const events: Record<string, unknown>[] = [];
  const blocks = accumulated.split('\n\n');
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed.startsWith('data:')) continue;
    const jsonStr = trimmed.replace(/^data:\s*/, '');
    try {
      events.push(JSON.parse(jsonStr));
    } catch {
      // Ignoruj uszkodzone chunki w teście
    }
  }

  return events;
}

// ── Testy jednostkowe ──────────────────────────────────────────────────

Deno.test('handleChatRequest - OPTIONS zwraca 200 i nagłówki CORS', async () => {
  const req = new Request('http://localhost/chat', { method: 'OPTIONS' });
  const res = await handleChatRequest(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test('handleChatRequest - GET zwraca 405 Method Not Allowed', async () => {
  const req = new Request('http://localhost/chat', { method: 'GET' });
  const res = await handleChatRequest(req);
  assertEquals(res.status, 405);
});

Deno.test('handleChatRequest - niepoprawny JSON zwraca 400', async () => {
  const req = new Request('http://localhost/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'nie-json',
  });
  const res = await handleChatRequest(req);
  assertEquals(res.status, 400);
});

Deno.test('handleChatRequest - brak pola message zwraca 400', async () => {
  const req = new Request('http://localhost/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thread_id: '123' }),
  });
  const res = await handleChatRequest(req);
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error, 'Brak wymaganego pola message');
});

Deno.test('handleChatRequest - brak autoryzacji zwraca 401', async () => {
  const mockDb = new MockChatDb();
  mockDb.userId = null; // symulacja braku zalogowanego użytkownika

  const req = new Request('http://localhost/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Cześć' }),
  });

  const res = await handleChatRequest(req, {
    dbClientFactory: () => mockDb,
    aiProvidersFactory: () => createMockAiProviders(),
  });

  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error, 'Brak autoryzacji');
});

Deno.test('rewriteChatQuery - przepisuje relatywne określenie "wczoraj" na bezwzględne daty', async () => {
  const mockLlm: LlmProvider = {
    providerName: 'gemini',
    model: 'gemini-2.5-flash',
    async generateText() {
      return JSON.stringify({
        search_query: 'pomysły aplikacja',
        date_from: '2026-09-30',
        date_to: '2026-09-30',
        kinds: ['idea'],
        categories: null,
      });
    },
    async generateJson<T>() {
      return {} as T;
    },
    async *streamText() {
      yield '';
    },
  };

  const rewrite = await rewriteChatQuery({
    message: 'Jakie miałem wczoraj pomysły?',
    llm: mockLlm,
    currentDate: '2026-10-01',
    timezone: 'Europe/Warsaw',
  });

  assertEquals(rewrite.date_from, '2026-09-30');
  assertEquals(rewrite.date_to, '2026-09-30');
  assertEquals(rewrite.kinds, ['idea']);
  assertEquals(rewrite.search_query, 'pomysły aplikacja');
});

Deno.test('rewriteChatQuery - repairCallback naprawia uszkodzony format odpowiedzi LLM', async () => {
  let callCount = 0;
  const mockLlm: LlmProvider = {
    providerName: 'gemini',
    model: 'gemini-2.5-flash',
    async generateText() {
      callCount++;
      if (callCount === 1) {
        return 'Oto wynik: date_from=2026-09-30, nie JSON';
      }
      return JSON.stringify({
        search_query: 'przemyślenia',
        date_from: '2026-09-30',
        date_to: '2026-09-30',
        kinds: ['reflection'],
        categories: null,
      });
    },
    async generateJson<T>() {
      return {} as T;
    },
    async *streamText() {
      yield '';
    },
  };

  const rewrite = await rewriteChatQuery({
    message: 'Co myślałem wczoraj?',
    llm: mockLlm,
    currentDate: '2026-10-01',
    timezone: 'Europe/Warsaw',
  });

  assertEquals(callCount, 2); // 1 próba + 1 naprawa
  assertEquals(rewrite.date_from, '2026-09-30');
  assertEquals(rewrite.kinds, ['reflection']);
});

Deno.test('extractCitations - ekstrahuje cytaty [doc:<id>] i ignoruje halucynowane ID', () => {
  const chunks: SearchChunkResult[] = [
    {
      id: 'chunk-1',
      document_id: 'doc-valid-1',
      content: 'Pierwsza ważna myśl z dnia.',
      idx: 0,
      day: '2026-09-30',
      kind: 'note',
      note_type: 'idea',
      title: 'Tytuł 1',
      slug: 'slug-1',
      category_id: null,
      category_name: null,
      category_color: null,
      similarity: 0.9,
    },
  ];

  const llmText = 'To jest fakt z notatki [doc:doc-valid-1], a to zmyślony fakt [doc:fake-hallucination-999].';
  const citations = extractCitations(llmText, chunks);

  assertEquals(citations.length, 1);
  assertEquals(citations[0].documentId, 'doc-valid-1');
  assertEquals(citations[0].title, 'Tytuł 1');
  assertEquals(citations[0].snippet, 'Pierwsza ważna myśl z dnia.');
});

Deno.test('formatContextFromChunks - poprawnie formatuje kontekst lub informuje o braku wpisów', () => {
  const emptyContext = formatContextFromChunks([]);
  assert(emptyContext.includes('Brak powiązanych fragmentów'));

  const chunks: SearchChunkResult[] = [
    {
      id: 'c1',
      document_id: 'doc-1',
      content: 'Treść testowa fragmentu.',
      idx: 0,
      day: '2026-10-01',
      kind: 'note',
      note_type: 'task',
      title: 'Zadanie',
      slug: 'slug',
      category_id: null,
      category_name: null,
      category_color: null,
      similarity: 0.8,
    },
  ];

  const formatted = formatContextFromChunks(chunks);
  assert(formatted.includes('[Dokument doc-1]'));
  assert(formatted.includes('Tytuł: Zadanie'));
  assert(formatted.includes('Treść testowa fragmentu.'));
});

Deno.test(
  'handleChatRequest - pełny przepływ RAG: przepisanie, wyszukiwanie, strumieniowanie SSE i cytaty',
  async () => {
    const mockDb = new MockChatDb();
    const mockAi = createMockAiProviders();

    const req = new Request('http://localhost/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer fake-jwt-token',
      },
      body: JSON.stringify({
        message: 'Jakie miałem wczoraj pomysły na aplikację?',
        current_date: '2026-10-01',
        timezone: 'Europe/Warsaw',
      }),
    });

    const res = await handleChatRequest(req, {
      dbClientFactory: () => mockDb,
      aiProvidersFactory: () => mockAi,
    });

    assertEquals(res.status, 200);
    assertEquals(res.headers.get('Content-Type'), 'text/event-stream; charset=utf-8');

    const events = await readSseEvents(res);
    assert(events.length > 0, 'Powinny pojawić się zdarzenia SSE');

    // Sprawdzenie tokenów
    const tokenEvents = events.filter((e) => e.type === 'token');
    assert(tokenEvents.length >= 4, 'Strumień powinien emitować tokeny');

    // Sprawdzenie zdarzenia końcowego done
    const doneEvent = events.find((e) => e.type === 'done');
    assert(doneEvent !== undefined, 'Musi pojawić się zdarzenie done');
    assertEquals(doneEvent.thread_id, 'thread-new-1');

    const citations = doneEvent.citations as Citation[];
    assertEquals(citations.length, 1);
    assertEquals(citations[0].documentId, 'doc-note-1');
    assertEquals(citations[0].title, 'Aplikacja Vocaly');

    // Weryfikacja wykonania search_chunks z filtrami
    assert(mockDb.lastSearchFilters !== null);
    assertEquals(mockDb.lastSearchFilters.dateFrom, '2026-09-30');
    assertEquals(mockDb.lastSearchFilters.dateTo, '2026-09-30');
    assertEquals(mockDb.lastSearchFilters.kinds, ['idea']);
    assertEquals(mockDb.lastSearchFilters.categoryIds, ['cat-1']);
    assert(mockDb.lastSearchFilters.queryEmbedding !== null);
    assertEquals(mockDb.lastSearchFilters.queryEmbedding!.length, 8);

    // Weryfikacja zapisu wiadomości w bazie
    assertEquals(mockDb.savedMessages.length, 2);
    assertEquals(mockDb.savedMessages[0].role, 'user');
    assertEquals(mockDb.savedMessages[0].content, 'Jakie miałem wczoraj pomysły na aplikację?');
    assertEquals(mockDb.savedMessages[1].role, 'assistant');
    assert((mockDb.savedMessages[1].content as string).includes('[doc:doc-note-1]'));
    assertEquals(mockDb.savedMessages[1].citations?.length, 1);
  },
);

Deno.test('handleChatRequest - pusty wynik wyszukiwania zwraca szczerą odpowiedź i brak cytatów', async () => {
  const mockDb = new MockChatDb();
  mockDb.chunksToReturn = []; // brak znalezionych fragmentów

  const mockAi = createMockAiProviders({
    answerTokens: ['Nie znalazłem w Twoim pamiętniku żadnych notatek na ten temat.'],
  });

  const req = new Request('http://localhost/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fake-jwt-token',
    },
    body: JSON.stringify({
      message: 'Co pisałem o fizyce kwantowej?',
    }),
  });

  const res = await handleChatRequest(req, {
    dbClientFactory: () => mockDb,
    aiProvidersFactory: () => mockAi,
  });

  assertEquals(res.status, 200);
  const events = await readSseEvents(res);
  const doneEvent = events.find((e) => e.type === 'done');
  assert(doneEvent !== undefined);

  const citations = doneEvent.citations as Citation[];
  assertEquals(citations.length, 0);
  assert((doneEvent.content as string).includes('Nie znalazłem w Twoim pamiętniku'));
});

Deno.test('handleChatRequest - błąd w trakcie strumieniowania emituje zdarzenie error', async () => {
  const mockDb = new MockChatDb();
  const mockAi = createMockAiProviders();
  // Symulacja błędu w trakcie pobierania tokenów
  mockAi.chat.streamText = async function* () {
    yield 'Start ';
    throw new Error('Awaria połączenia z modelem AI');
  };

  const req = new Request('http://localhost/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fake-jwt-token',
    },
    body: JSON.stringify({
      message: 'Test błędu',
    }),
  });

  const res = await handleChatRequest(req, {
    dbClientFactory: () => mockDb,
    aiProvidersFactory: () => mockAi,
  });

  assertEquals(res.status, 200);
  const events = await readSseEvents(res);
  const errorEvent = events.find((e) => e.type === 'error');
  assert(errorEvent !== undefined);
  assert((errorEvent.error as string).includes('Awaria połączenia z modelem AI'));
});
