import { processRecordingPipeline } from './processRecording.ts';
import {
  IDatabaseClient,
  IStorageClient,
  RecordingRow,
  DocumentInsert,
  DocumentChunkInsert,
  LinkInsert,
  CandidateDocument,
} from '../db/types.ts';
import { AiProviders } from '../ai/factory.ts';
import { SttProvider, LlmProvider, EmbeddingProvider } from '../ai/types.ts';

class InMemoryDatabaseClient implements IDatabaseClient {
  public recordings: Map<string, RecordingRow> = new Map();
  public documents: DocumentInsert[] = [];
  public chunks: DocumentChunkInsert[] = [];
  public links: LinkInsert[] = [];
  public categories: Map<string, string> = new Map();
  public dayRebuildQueue: Set<string> = new Set();

  async getRecording(id: string): Promise<RecordingRow | null> {
    const rec = this.recordings.get(id);
    return rec ? { ...rec } : null;
  }

  async updateRecording(id: string, updates: Partial<RecordingRow>): Promise<void> {
    const rec = this.recordings.get(id);
    if (!rec) throw new Error(`Brak nagrania: ${id}`);
    this.recordings.set(id, { ...rec, ...updates });
  }

  async getOrCreateCategory(userId: string, categoryName: string): Promise<string | null> {
    const key = `${userId}:${categoryName}`;
    if (!this.categories.has(key)) {
      this.categories.set(key, `cat-${this.categories.size + 1}`);
    }
    return this.categories.get(key) || null;
  }

  async slugExists(userId: string, slug: string): Promise<boolean> {
    return this.documents.some((d) => d.user_id === userId && d.slug === slug);
  }

  async insertDocuments(docs: DocumentInsert[]): Promise<void> {
    for (const doc of docs) {
      const idx = this.documents.findIndex((d) => d.user_id === doc.user_id && d.slug === doc.slug);
      if (idx >= 0) {
        this.documents[idx] = { ...doc };
      } else {
        this.documents.push({ ...doc });
      }
    }
  }

  async getDocumentsByRecordingId(recordingId: string): Promise<DocumentInsert[]> {
    return this.documents.filter((d) => d.recording_id === recordingId);
  }

  async insertDocumentChunks(chunks: DocumentChunkInsert[]): Promise<void> {
    for (const chunk of chunks) {
      const idx = this.chunks.findIndex((c) => c.document_id === chunk.document_id && c.idx === chunk.idx);
      if (idx >= 0) {
        this.chunks[idx] = { ...chunk };
      } else {
        this.chunks.push({ ...chunk });
      }
    }
  }

  async getCandidateDocuments(userId: string, excludeDocId: string, limit: number = 10): Promise<CandidateDocument[]> {
    return this.documents
      .filter((d) => d.user_id === userId && d.id !== excludeDocId)
      .slice(0, limit)
      .map((d) => ({
        id: d.id,
        title: d.title,
        slug: d.slug,
        snippet: (d.body_md || '').slice(0, 300),
      }));
  }

  async insertLinks(links: LinkInsert[]): Promise<void> {
    for (const link of links) {
      this.links.push({ ...link });
    }
  }

  async upsertDayRebuildQueue(userId: string, day: string): Promise<void> {
    this.dayRebuildQueue.add(`${userId}:${day}`);
  }
}

class InMemoryStorageClient implements IStorageClient {
  public audioFiles: Map<string, Uint8Array> = new Map();
  public markdownFiles: Map<string, string> = new Map();

  async downloadAudio(path: string): Promise<Uint8Array> {
    const data = this.audioFiles.get(path);
    if (!data) throw new Error(`Audio nie istnieje pod ścieżką: ${path}`);
    return data;
  }

  async uploadMarkdown(path: string, content: string): Promise<void> {
    this.markdownFiles.set(path, content);
  }
}

function createMockProviders(overrides?: {
  sttFail?: boolean;
  structureFail?: boolean;
  sttCallCount?: { count: number };
  structureCallCount?: { count: number };
  linkProposal?: { targetId: string; score: number; reason: string }[];
}): AiProviders {
  const sttAdapter: SttProvider = {
    providerName: 'groq',
    model: 'whisper-large-v3',
    async transcribe() {
      if (overrides?.sttCallCount) overrides.sttCallCount.count++;
      if (overrides?.sttFail) {
        throw new Error('Błąd STT (np. limit zapytań lub awaria sieci)');
      }
      return 'Mam dzisiaj trzy myśli: pierwsza to pomysł na aplikację Vocaly, druga to zadanie kupić mleko, a trzecia to refleksja o spokoju ducha.';
    },
  };

  const structureAdapter: LlmProvider = {
    providerName: 'groq',
    model: 'openai/gpt-oss-120b',
    async generateText() {
      if (overrides?.structureCallCount) overrides.structureCallCount.count++;
      if (overrides?.structureFail) {
        throw new Error('Błąd LLM Structure (np. timeout)');
      }
      return JSON.stringify({
        notes: [
          {
            title: 'Pomysł na aplikację Vocaly',
            noteType: 'idea',
            category: 'Projekty',
            tags: ['vocaly', 'ai'],
            content: 'Rozwijać architekturę audio i pipeline myśli.',
          },
          {
            title: 'Kupić mleko',
            noteType: 'task',
            category: 'Dom',
            tags: ['zakupy'],
            content: 'Kupić owsiane mleko w drodze powrotnej.',
          },
          {
            title: 'Spokój ducha',
            noteType: 'reflection',
            category: 'Osobiste',
            tags: ['mindfulness', 'spokój'],
            content: 'Doceniać małe chwile i regularnie odpoczywać.',
          },
        ],
      });
    },
    async generateJson<T = unknown>() {
      return {} as T;
    },
    async *streamText() {
      yield '';
    },
  };

  const embeddingAdapter: EmbeddingProvider = {
    providerName: 'gemini',
    model: 'text-embedding-004',
    dimension: 1536,
    async embed() {
      return new Array(1536).fill(0.02);
    },
    async embedBatch(texts: string[]) {
      return texts.map(() => new Array(1536).fill(0.02));
    },
  };

  const linkAdapter: LlmProvider = {
    providerName: 'groq',
    model: 'openai/gpt-oss-120b',
    async generateText() {
      const links = overrides?.linkProposal || [];
      return JSON.stringify({ links });
    },
    async generateJson<T = unknown>() {
      return {} as T;
    },
    async *streamText() {
      yield '';
    },
  };

  return {
    stt: sttAdapter,
    structure: structureAdapter,
    digest: structureAdapter,
    link: linkAdapter,
    chat: structureAdapter,
    embedding: embeddingAdapter,
  };
}

Deno.test(
  'processRecordingPipeline - nagranie z 3 myślami daje 3 dokumenty kind=note z typem, kategorią, tagami',
  async () => {
    const db = new InMemoryDatabaseClient();
    const storage = new InMemoryStorageClient();

    const recordingId = 'rec-001';
    const userId = 'user-abc';
    const audioPath = `${userId}/${recordingId}.m4a`;

    db.recordings.set(recordingId, {
      id: recordingId,
      user_id: userId,
      source: 'phone',
      recorded_at: '2026-09-27T10:00:00+02:00',
      duration_ms: 15000,
      audio_path: audioPath,
      raw_transcript: null,
      status: 'uploaded',
      attempts: 0,
      last_error: null,
    });

    storage.audioFiles.set(audioPath, new Uint8Array([1, 2, 3, 4]));

    const aiProviders = createMockProviders();

    const result = await processRecordingPipeline({
      recordingId,
      db,
      storage,
      aiProviders,
    });

    if (result.status !== 'done') {
      throw new Error(`Oczekiwano statusu 'done', otrzymano: ${result.status}`);
    }
    if (result.documentIds.length !== 3) {
      throw new Error(`Oczekiwano 3 dokumentów, otrzymano: ${result.documentIds.length}`);
    }

    // Weryfikacja bazy danych
    const recAfter = await db.getRecording(recordingId);
    if (recAfter?.status !== 'done') {
      throw new Error(`Status nagrania powinien być 'done', jest: ${recAfter?.status}`);
    }
    if (!recAfter.raw_transcript) {
      throw new Error('raw_transcript powinien być zapisany');
    }

    const docs = await db.getDocumentsByRecordingId(recordingId);
    if (docs.length !== 3) {
      throw new Error(`Oczekiwano 3 dokumentów w bazie, otrzymano: ${docs.length}`);
    }

    const ideaDoc = docs.find((d) => d.note_type === 'idea');
    const taskDoc = docs.find((d) => d.note_type === 'task');
    const reflectionDoc = docs.find((d) => d.note_type === 'reflection');

    if (!ideaDoc || !taskDoc || !reflectionDoc) {
      throw new Error('Brak wymaganego typu dokumentu w wynikach');
    }

    if (ideaDoc.kind !== 'note' || taskDoc.kind !== 'note' || reflectionDoc.kind !== 'note') {
      throw new Error('Wszystkie dokumenty powinny mieć kind="note"');
    }

    if (!ideaDoc.tags.includes('vocaly') || !taskDoc.tags.includes('zakupy')) {
      throw new Error('Tagi nie zostały poprawnie przypisane do dokumentów');
    }

    // Weryfikacja plików .md w Storage i zgodności z szablonem z §5
    if (storage.markdownFiles.size !== 3) {
      throw new Error(`Oczekiwano 3 plików Markdown w storage, jest: ${storage.markdownFiles.size}`);
    }

    const ideaMd = storage.markdownFiles.get(ideaDoc.md_path);
    if (!ideaMd) {
      throw new Error(`Brak pliku .md pod ścieżką: ${ideaDoc.md_path}`);
    }

    if (!ideaMd.includes('type: note')) throw new Error('Markdown brakuje "type: note"');
    if (!ideaMd.includes('note_type: idea')) throw new Error('Markdown brakuje "note_type: idea"');
    if (!ideaMd.includes(`date: 2026-09-27`)) throw new Error('Markdown brakuje daty');
    if (!ideaMd.includes('tags: [vocaly, ai]')) throw new Error('Markdown brakuje tagów');
    if (!ideaMd.includes('# Pomysł na aplikację Vocaly')) throw new Error('Markdown brakuje nagłówka #');

    // Weryfikacja chunków i wektorów embeddingu
    if (db.chunks.length !== 3) {
      throw new Error(`Oczekiwano 3 chunków, jest: ${db.chunks.length}`);
    }
    for (const chunk of db.chunks) {
      if (chunk.embedding.length !== 1536) {
        throw new Error(`Długość wektora embeddingu ${chunk.embedding.length} != 1536`);
      }
    }

    // Weryfikacja kolejki przebudowy dnia
    if (!db.dayRebuildQueue.has(`${userId}:2026-09-27`)) {
      throw new Error('Brak wpisu w kolejce przebudowy dnia dla 2026-09-27');
    }
  },
);

Deno.test(
  'processRecordingPipeline - błąd AI ustawia status "failed" z last_error, nagranie i audio zostają',
  async () => {
    const db = new InMemoryDatabaseClient();
    const storage = new InMemoryStorageClient();

    const recordingId = 'rec-err-1';
    const userId = 'user-err';
    const audioPath = `${userId}/${recordingId}.m4a`;

    db.recordings.set(recordingId, {
      id: recordingId,
      user_id: userId,
      source: 'phone',
      recorded_at: '2026-09-27T10:00:00+02:00',
      duration_ms: 5000,
      audio_path: audioPath,
      raw_transcript: null,
      status: 'uploaded',
      attempts: 0,
      last_error: null,
    });

    const dummyAudio = new Uint8Array([9, 8, 7]);
    storage.audioFiles.set(audioPath, dummyAudio);

    // Symulujemy błąd strukturyzacji LLM
    const aiProviders = createMockProviders({ structureFail: true });

    let threw = false;
    try {
      await processRecordingPipeline({
        recordingId,
        db,
        storage,
        aiProviders,
      });
    } catch (err: unknown) {
      threw = true;
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('Błąd LLM Structure')) {
        throw new Error(`Oczekiwano błędu LLM Structure, otrzymano: ${msg}`);
      }
    }

    if (!threw) {
      throw new Error('Pipeline powinien był rzucić błąd');
    }

    // Nagranie musi mieć status failed i zapisany last_error oraz attempts=1
    const recAfter = await db.getRecording(recordingId);
    if (recAfter?.status !== 'failed') {
      throw new Error(`Oczekiwano statusu 'failed', jest: ${recAfter?.status}`);
    }
    if (!recAfter.last_error?.includes('Błąd LLM Structure')) {
      throw new Error(`last_error powinien zawierać treść błędu, jest: ${recAfter?.last_error}`);
    }
    if (recAfter.attempts !== 1) {
      throw new Error(`attempts powinno wynosić 1, jest: ${recAfter?.attempts}`);
    }

    // Nagranie i plik audio zostają w storage!
    const audioInStorage = storage.audioFiles.get(audioPath);
    if (!audioInStorage || audioInStorage.length !== dummyAudio.length) {
      throw new Error('Plik audio w storage nie może zostać usunięty przy błędzie!');
    }
  },
);

Deno.test(
  'processRecordingPipeline - ponowne wywołanie po błędzie kontynuuje od ostatniego kroku bez duplikatów',
  async () => {
    const db = new InMemoryDatabaseClient();
    const storage = new InMemoryStorageClient();

    const recordingId = 'rec-retry-1';
    const userId = 'user-retry';
    const audioPath = `${userId}/${recordingId}.m4a`;

    // Nagranie miało już pomyślną transkrypcję, ale poległo w trakcie podziału
    db.recordings.set(recordingId, {
      id: recordingId,
      user_id: userId,
      source: 'watch',
      recorded_at: '2026-09-27T10:00:00+02:00',
      duration_ms: 12000,
      audio_path: audioPath,
      raw_transcript: 'Istniejąca wcześniej transkrypcja z pierwszego kroku.',
      status: 'transcribed',
      attempts: 1,
      last_error: 'Poprzedni błąd',
    });

    storage.audioFiles.set(audioPath, new Uint8Array([5, 6, 7]));

    const sttCallCount = { count: 0 };
    const structureCallCount = { count: 0 };
    const aiProviders = createMockProviders({
      sttCallCount,
      structureCallCount,
    });

    const result = await processRecordingPipeline({
      recordingId,
      db,
      storage,
      aiProviders,
    });

    if (result.status !== 'done') {
      throw new Error(`Oczekiwano statusu 'done', jest: ${result.status}`);
    }

    // STT NIE POWINNO BYĆ PONOWNIE WYWOŁYWANE!
    if (sttCallCount.count !== 0) {
      throw new Error(`STT nie powinno być wywołane, a wywołano ${sttCallCount.count} razy`);
    }

    // Structure LLM zostało wywołane raz
    if (structureCallCount.count !== 1) {
      throw new Error(`Structure LLM powinno być wywołane 1 raz, wywołano ${structureCallCount.count}`);
    }

    // Ponowne wywołanie po 'done' - pełna idempotencja
    const secondResult = await processRecordingPipeline({
      recordingId,
      db,
      storage,
      aiProviders,
    });

    if (secondResult.status !== 'done') {
      throw new Error('Drugie wywołanie powinno natychmiast zwrócić done');
    }
    if (structureCallCount.count !== 1) {
      throw new Error('Po statusie done, LLM nie powinien być wywoływany');
    }

    // Brak duplikatów w bazie
    const allDocs = await db.getDocumentsByRecordingId(recordingId);
    if (allDocs.length !== 3) {
      throw new Error(`Oczekiwano dokładnie 3 dokumentów bez duplikatów, jest: ${allDocs.length}`);
    }
  },
);

Deno.test('processRecordingPipeline - linki: LLM ocenia tylko kandydatów, ID spoza listy są odrzucane', async () => {
  const db = new InMemoryDatabaseClient();
  const storage = new InMemoryStorageClient();

  const userId = 'user-link-test';
  const existingDocId = 'doc-candidate-valid-1';

  // Istniejący dokument w bazie (będzie kandydatem)
  db.documents.push({
    id: existingDocId,
    user_id: userId,
    kind: 'note',
    note_type: 'idea',
    day: '2026-09-26',
    title: 'Wcześniejsza notatka o Vocaly',
    slug: '2026-09-26-wczesniejsza-notatka',
    data: {},
    body_md: 'Notatka na temat architektury.',
    md_path: `${userId}/notes/2026-09-26-wczesniejsza-notatka.md`,
    category_id: null,
    tags: ['vocaly'],
    recording_id: 'rec-old',
  });

  const recordingId = 'rec-link-test';
  const audioPath = `${userId}/${recordingId}.m4a`;
  db.recordings.set(recordingId, {
    id: recordingId,
    user_id: userId,
    source: 'web',
    recorded_at: '2026-09-27T12:00:00+02:00',
    duration_ms: 10000,
    audio_path: audioPath,
    raw_transcript: 'Notatka nawiązująca do Vocaly.',
    status: 'transcribed',
    attempts: 0,
    last_error: null,
  });

  storage.audioFiles.set(audioPath, new Uint8Array([1, 1, 1]));

  // LLM proponuje 2 powiązania: jedno do dozwolonego kandydata, drugie do sfałszowanego ID spoza bazy!
  const aiProviders = createMockProviders({
    linkProposal: [
      {
        targetId: existingDocId,
        score: 0.9,
        reason: 'Bardzo bliskie powiązanie tematyczne.',
      },
      {
        targetId: 'hacked-id-not-in-candidates-list',
        score: 0.99,
        reason: 'Powiązanie spoza listy kandydatów.',
      },
    ],
  });

  await processRecordingPipeline({
    recordingId,
    db,
    storage,
    aiProviders,
  });

  // Weryfikacja: tylko dozwolony kandydat został zapisany w tabeli links
  const links = db.links;
  const unauthorizedLink = links.find((l) => l.target_id === 'hacked-id-not-in-candidates-list');
  if (unauthorizedLink) {
    throw new Error('Wykryto niedozwolony link z ID spoza listy kandydatów!');
  }

  const validLink = links.find((l) => l.target_id === existingDocId);
  if (!validLink) {
    throw new Error('Oczekiwano poprawnego powiązania z prawidłowym kandydatem');
  }
  if (validLink.score !== 0.9) {
    throw new Error(`Niepoprawny score: ${validLink.score}`);
  }
});
