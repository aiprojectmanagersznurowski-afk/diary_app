import { buildDailySingle } from './buildDaily.ts';
import {
  IBuildDailyDatabaseClient,
  ProfileRow,
  NoteRow,
  DocumentInsert,
  DocumentChunkInsert,
  RecordingSummary,
} from '../db/types.ts';
import { AiProviders } from '../ai/factory.ts';
import { LlmProvider, EmbeddingProvider } from '../ai/types.ts';

const TEST_PROMPT = '{{PERSONALITY_PROMPT}} {{LIFE_GOALS}} {{DAY_NOTES}}';

class MockBuildDailyDb implements IBuildDailyDatabaseClient {
  profiles = new Map<string, ProfileRow>();
  notesByDay = new Map<string, NoteRow[]>();
  dailyDocs = new Map<string, DocumentInsert>();
  chunksByDoc = new Map<string, DocumentChunkInsert[]>();
  linksByDoc = new Map<string, string[]>();
  queue = new Set<string>();
  recordings = new Map<string, RecordingSummary>();
  uploadedMarkdown = new Map<string, string>();

  private dayKey(userId: string, day: string) {
    return `${userId}::${day}`;
  }

  async getProfile(userId: string): Promise<ProfileRow | null> {
    return this.profiles.get(userId) ?? null;
  }

  async getNotesForDay(userId: string, day: string): Promise<NoteRow[]> {
    return this.notesByDay.get(this.dayKey(userId, day)) ?? [];
  }

  async getDailyDocument(userId: string, day: string): Promise<DocumentInsert | null> {
    return this.dailyDocs.get(this.dayKey(userId, day)) ?? null;
  }

  async upsertDailyDocument(doc: DocumentInsert): Promise<void> {
    this.dailyDocs.set(this.dayKey(doc.user_id, doc.day), doc);
  }

  async replaceDocumentChunks(documentId: string, chunks: DocumentChunkInsert[]): Promise<void> {
    this.chunksByDoc.set(documentId, chunks);
  }

  async replaceDayLinks(_userId: string, dailyDocId: string, noteIds: string[]): Promise<void> {
    this.linksByDoc.set(dailyDocId, noteIds);
  }

  async updateProfile(userId: string, updates: Partial<ProfileRow>): Promise<void> {
    const existing = this.profiles.get(userId);
    if (existing) {
      this.profiles.set(userId, { ...existing, ...updates });
    }
  }

  async deleteDayRebuildQueueEntry(userId: string, day: string): Promise<void> {
    this.queue.delete(this.dayKey(userId, day));
  }

  async getRecordingsByIds(ids: string[]): Promise<RecordingSummary[]> {
    return ids.map((id) => this.recordings.get(id)).filter((r): r is RecordingSummary => !!r);
  }

  async uploadMarkdown(path: string, content: string): Promise<void> {
    this.uploadedMarkdown.set(path, content);
  }
}

function makeAiProviders(digestJson: Record<string, unknown>): AiProviders {
  const digestLlm: LlmProvider = {
    providerName: 'groq',
    model: 'test-digest-model',
    async generateText() {
      return JSON.stringify(digestJson);
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
    model: 'test-embedding-model',
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

function validDigest(overrides: Record<string, unknown> = {}) {
  return {
    dominantThought: 'Dziś skupiłem się na jednym dużym zadaniu.',
    summary: 'Produktywny dzień.',
    quotes: [],
    impactOnGoals: 'Krok bliżej celu.',
    goalImpactType: 'positive',
    completedTasks: [],
    importantEvents: [],
    emotions: ['Satysfakcja'],
    emotionTriggers: [],
    fatigueLevel: 4,
    stressVsCalm: 'calm',
    gratefulFor: 'Za dobry sen.',
    triggeredStress: null,
    triggeredAnger: null,
    triggeredJoy: null,
    triggeredCalm: null,
    goalAdvice: null,
    ideas: [],
    ...overrides,
  };
}

function makeNote(overrides: Partial<NoteRow> = {}): NoteRow {
  return {
    id: 'note-1',
    title: 'Pomysł na appkę',
    note_type: 'idea',
    body_md: 'Treść notatki.',
    slug: '2026-09-23-pomysl-na-appke',
    tags: ['projekt-x'],
    created_at: '2026-09-23T09:00:00Z',
    recording_id: 'rec-1',
    ...overrides,
  };
}

Deno.test('buildDailySingle - kilka notatek daje jeden dokument kind=daily z sekcjami', async () => {
  const db = new MockBuildDailyDb();
  db.profiles.set('user-1', {
    user_id: 'user-1',
    life_goals: ['Nauczyć się gry na gitarze'],
    ai_personality: null,
    timezone: 'Europe/Warsaw',
    current_streak: 0,
    last_entry_day: null,
    badges: [],
  });
  db.notesByDay.set('user-1::2026-09-23', [
    makeNote({ id: 'note-1' }),
    makeNote({ id: 'note-2', title: 'Refleksja', note_type: 'reflection' }),
  ]);

  const ai = makeAiProviders(
    validDigest({ ideas: [{ documentId: 'note-1', title: 'Appka', oneLiner: 'Zrobić appkę.' }] }),
  );

  const result = await buildDailySingle({
    userId: 'user-1',
    day: '2026-09-23',
    db,
    aiProviders: ai,
    digestPromptTemplate: TEST_PROMPT,
  });

  if (result.status !== 'done' || !result.dailyDocId) {
    throw new Error(`Oczekiwano status 'done' z dailyDocId, otrzymano: ${JSON.stringify(result)}`);
  }

  const doc = db.dailyDocs.get('user-1::2026-09-23');
  if (!doc || doc.kind !== 'daily') {
    throw new Error('Brak zapisanego dokumentu kind=daily');
  }
  if (!doc.body_md.includes('[[2026-09-23-pomysl-na-appke|Appka]]')) {
    throw new Error('Sekcja pomysłów nie zawiera odnośnika do notatki idea');
  }

  const links = db.linksByDoc.get(result.dailyDocId!);
  if (!links || links.length !== 2) {
    throw new Error(`Oczekiwano 2 powiązań kind=day, otrzymano: ${JSON.stringify(links)}`);
  }
});

Deno.test('buildDailySingle - pomysł spoza listy notatek dnia jest odrzucany (ADR-005)', async () => {
  const db = new MockBuildDailyDb();
  db.profiles.set('user-1', {
    user_id: 'user-1',
    life_goals: [],
    ai_personality: null,
    timezone: 'Europe/Warsaw',
    current_streak: 0,
    last_entry_day: null,
    badges: [],
  });
  db.notesByDay.set('user-1::2026-09-23', [makeNote({ id: 'note-1' })]);

  const ai = makeAiProviders(
    validDigest({
      ideas: [{ documentId: 'note-nieistniejacy', title: 'Zmyślony', oneLiner: 'Nie powinien wystąpić.' }],
    }),
  );

  await buildDailySingle({
    userId: 'user-1',
    day: '2026-09-23',
    db,
    aiProviders: ai,
    digestPromptTemplate: TEST_PROMPT,
  });

  const doc = db.dailyDocs.get('user-1::2026-09-23');
  if (doc!.body_md.includes('Zmyślony')) {
    throw new Error('Pomysł ze zmyślonym ID nie powinien pojawić się w wyrenderowanym pliku');
  }
});

Deno.test('buildDailySingle - ponowne wywołanie dla tego samego dnia jest idempotentne (ten sam id)', async () => {
  const db = new MockBuildDailyDb();
  db.profiles.set('user-1', {
    user_id: 'user-1',
    life_goals: [],
    ai_personality: null,
    timezone: 'Europe/Warsaw',
    current_streak: 0,
    last_entry_day: null,
    badges: [],
  });
  db.notesByDay.set('user-1::2026-09-23', [makeNote()]);

  const ai = makeAiProviders(validDigest());

  const first = await buildDailySingle({
    userId: 'user-1',
    day: '2026-09-23',
    db,
    aiProviders: ai,
    digestPromptTemplate: TEST_PROMPT,
  });

  const second = await buildDailySingle({
    userId: 'user-1',
    day: '2026-09-23',
    db,
    aiProviders: ai,
    digestPromptTemplate: TEST_PROMPT,
  });

  if (first.dailyDocId !== second.dailyDocId) {
    throw new Error(`Przebudowa tego samego dnia zmieniła id dokumentu: ${first.dailyDocId} -> ${second.dailyDocId}`);
  }

  const chunks = db.chunksByDoc.get(second.dailyDocId!);
  if (!chunks || chunks.length !== 1) {
    throw new Error('Przebudowa powinna zastąpić chunki, nie zduplikować ich');
  }
});

Deno.test('buildDailySingle - dzień bez notatek jest pomijany i czyści kolejkę', async () => {
  const db = new MockBuildDailyDb();
  db.queue.add('user-1::2026-09-23');
  const ai = makeAiProviders(validDigest());

  const result = await buildDailySingle({
    userId: 'user-1',
    day: '2026-09-23',
    db,
    aiProviders: ai,
    digestPromptTemplate: TEST_PROMPT,
  });

  if (result.status !== 'skipped' || result.dailyDocId !== null) {
    throw new Error(`Oczekiwano status 'skipped' bez dailyDocId, otrzymano: ${JSON.stringify(result)}`);
  }
  if (db.queue.has('user-1::2026-09-23')) {
    throw new Error('Wpis w kolejce powinien zostać usunięty mimo braku notatek');
  }
});

Deno.test('buildDailySingle - seria rośnie dla kolejnego dnia z rzędu', async () => {
  const db = new MockBuildDailyDb();
  db.profiles.set('user-1', {
    user_id: 'user-1',
    life_goals: [],
    ai_personality: null,
    timezone: 'Europe/Warsaw',
    current_streak: 3,
    last_entry_day: '2026-09-22',
    badges: [],
  });
  db.notesByDay.set('user-1::2026-09-23', [makeNote()]);
  const ai = makeAiProviders(validDigest());

  await buildDailySingle({
    userId: 'user-1',
    day: '2026-09-23',
    db,
    aiProviders: ai,
    digestPromptTemplate: TEST_PROMPT,
  });

  const profile = db.profiles.get('user-1')!;
  if (profile.current_streak !== 4 || profile.last_entry_day !== '2026-09-23') {
    throw new Error(`Oczekiwano current_streak=4, last_entry_day=2026-09-23, otrzymano: ${JSON.stringify(profile)}`);
  }
});

Deno.test('buildDailySingle - seria resetuje się po przerwie', async () => {
  const db = new MockBuildDailyDb();
  db.profiles.set('user-1', {
    user_id: 'user-1',
    life_goals: [],
    ai_personality: null,
    timezone: 'Europe/Warsaw',
    current_streak: 5,
    last_entry_day: '2026-09-10',
    badges: [],
  });
  db.notesByDay.set('user-1::2026-09-23', [makeNote()]);
  const ai = makeAiProviders(validDigest());

  await buildDailySingle({
    userId: 'user-1',
    day: '2026-09-23',
    db,
    aiProviders: ai,
    digestPromptTemplate: TEST_PROMPT,
  });

  const profile = db.profiles.get('user-1')!;
  if (profile.current_streak !== 1) {
    throw new Error(`Oczekiwano resetu serii do 1 po przerwie, otrzymano: ${profile.current_streak}`);
  }
});
