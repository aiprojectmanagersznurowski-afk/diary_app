import { handleBuildDailyRequest } from './index.ts';
import {
  IBuildDailyDatabaseClient,
  ProfileRow,
  NoteRow,
  DocumentInsert,
  RecordingSummary,
} from '../_shared/db/types.ts';
import { AiProviders } from '../_shared/ai/factory.ts';
import { LlmProvider, EmbeddingProvider } from '../_shared/ai/types.ts';

class MockDb implements IBuildDailyDatabaseClient {
  public profile: ProfileRow = {
    user_id: 'user-1',
    life_goals: [],
    ai_personality: null,
    timezone: 'Europe/Warsaw',
    current_streak: 0,
    last_entry_day: null,
    badges: [],
  };
  public notes: NoteRow[] = [
    {
      id: 'note-1',
      title: 'Notatka testowa',
      note_type: 'idea',
      body_md: 'Treść notatki.',
      slug: '2026-09-23-notatka-testowa',
      tags: [],
      created_at: '2026-09-23T09:00:00Z',
      recording_id: null,
    },
  ];

  async getProfile(): Promise<ProfileRow | null> {
    return this.profile;
  }
  async getNotesForDay(): Promise<NoteRow[]> {
    return this.notes;
  }
  async getDailyDocument(): Promise<DocumentInsert | null> {
    return null;
  }
  async upsertDailyDocument(): Promise<void> {}
  async replaceDocumentChunks(): Promise<void> {}
  async replaceDayLinks(): Promise<void> {}
  async updateProfile(): Promise<void> {}
  async deleteDayRebuildQueueEntry(): Promise<void> {}
  async getRecordingsByIds(): Promise<RecordingSummary[]> {
    return [];
  }
  async uploadMarkdown(): Promise<void> {}
}

function createDummyAiProviders(): AiProviders {
  const digestLlm: LlmProvider = {
    providerName: 'groq',
    model: 'test-digest-model',
    async generateText() {
      return JSON.stringify({
        dominantThought: 'Test',
        summary: 'Test summary',
        quotes: [],
        impactOnGoals: 'Test impact',
        goalImpactType: 'neutral',
        completedTasks: [],
        importantEvents: [],
        emotions: [],
        emotionTriggers: [],
        fatigueLevel: 5,
        stressVsCalm: 'neutral',
        gratefulFor: 'Test',
        triggeredStress: null,
        triggeredAnger: null,
        triggeredJoy: null,
        triggeredCalm: null,
        goalAdvice: null,
        ideas: [],
      });
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
      return new Array(8).fill(0.01);
    },
    async embedBatch(texts: string[]) {
      return texts.map(() => new Array(8).fill(0.01));
    },
  };

  return {
    stt: {} as AiProviders['stt'],
    structure: digestLlm,
    digest: digestLlm,
    link: digestLlm,
    chat: digestLlm,
    embedding,
  };
}

Deno.test('handleBuildDailyRequest - OPTIONS zwraca 200 i nagłówki CORS', async () => {
  const req = new Request('http://localhost/build-daily', { method: 'OPTIONS' });
  const res = await handleBuildDailyRequest(req);
  if (res.status !== 200) {
    throw new Error(`Oczekiwano statusu 200 dla OPTIONS, otrzymano: ${res.status}`);
  }
  if (!res.headers.get('Access-Control-Allow-Origin')) {
    throw new Error('Brak nagłówka Access-Control-Allow-Origin w odpowiedzi OPTIONS');
  }
});

Deno.test('handleBuildDailyRequest - GET zwraca 405 Method Not Allowed', async () => {
  const req = new Request('http://localhost/build-daily', { method: 'GET' });
  const res = await handleBuildDailyRequest(req);
  if (res.status !== 405) {
    throw new Error(`Oczekiwano statusu 405, otrzymano: ${res.status}`);
  }
});

Deno.test('handleBuildDailyRequest - niepoprawny JSON zwraca 400', async () => {
  const req = new Request('http://localhost/build-daily', {
    method: 'POST',
    body: 'invalid-json',
    headers: { 'Content-Type': 'application/json' },
  });
  const res = await handleBuildDailyRequest(req);
  if (res.status !== 400) {
    throw new Error(`Oczekiwano statusu 400 dla niepoprawnego JSON, otrzymano: ${res.status}`);
  }
});

Deno.test('handleBuildDailyRequest - brak user_id/day zwraca 400', async () => {
  const req = new Request('http://localhost/build-daily', {
    method: 'POST',
    body: JSON.stringify({ something_else: 123 }),
    headers: { 'Content-Type': 'application/json' },
  });
  const res = await handleBuildDailyRequest(req);
  if (res.status !== 400) {
    throw new Error(`Oczekiwano statusu 400 dla braku user_id/day, otrzymano: ${res.status}`);
  }
});

Deno.test('handleBuildDailyRequest - poprawny payload wywołuje pipeline i zwraca 200', async () => {
  const db = new MockDb();
  const ai = createDummyAiProviders();

  const req = new Request('http://localhost/build-daily', {
    method: 'POST',
    body: JSON.stringify({ user_id: 'user-1', day: '2026-09-23' }),
    headers: { 'Content-Type': 'application/json' },
  });

  const res = await handleBuildDailyRequest(req, {
    dbClientFactory: () => db,
    aiProvidersFactory: () => ai,
  });

  if (res.status !== 200) {
    const errText = await res.text();
    throw new Error(`Oczekiwano statusu 200, otrzymano ${res.status}: ${errText}`);
  }

  const json = await res.json();
  if (json.status !== 'done' || !json.dailyDocId) {
    throw new Error(`Oczekiwano status 'done' z dailyDocId, otrzymano: ${JSON.stringify(json)}`);
  }
});
