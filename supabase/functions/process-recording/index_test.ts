import { handleProcessRecordingRequest } from './index.ts';
import {
  IDatabaseClient,
  IStorageClient,
  RecordingRow,
  DocumentInsert,
  CandidateDocument,
} from '../_shared/db/types.ts';
import { AiProviders } from '../_shared/ai/factory.ts';
import { SttProvider, LlmProvider, EmbeddingProvider } from '../_shared/ai/types.ts';

class MockDb implements IDatabaseClient {
  public recording: RecordingRow = {
    id: 'rec-test-123',
    user_id: 'user-1',
    source: 'phone',
    recorded_at: '2026-09-27T14:00:00+02:00',
    duration_ms: 10000,
    audio_path: 'user-1/rec-test-123.m4a',
    raw_transcript: 'Treść nagrania',
    status: 'transcribed',
    attempts: 0,
    last_error: null,
  };

  async getRecording(id: string): Promise<RecordingRow | null> {
    return id === this.recording.id ? { ...this.recording } : null;
  }
  async updateRecording(_id: string, updates: Partial<RecordingRow>): Promise<void> {
    this.recording = { ...this.recording, ...updates };
  }
  async getOrCreateCategory(): Promise<string | null> {
    return 'cat-1';
  }
  async slugExists(): Promise<boolean> {
    return false;
  }
  async insertDocuments(): Promise<void> {}
  async getDocumentsByRecordingId(): Promise<DocumentInsert[]> {
    return [];
  }
  async insertDocumentChunks(): Promise<void> {}
  async getCandidateDocuments(): Promise<CandidateDocument[]> {
    return [];
  }
  async insertLinks(): Promise<void> {}
  async upsertDayRebuildQueue(): Promise<void> {}
}

class MockStorage implements IStorageClient {
  async downloadAudio(): Promise<Uint8Array> {
    return new Uint8Array([1, 2, 3]);
  }
  async uploadMarkdown(): Promise<void> {}
}

function createDummyAiProviders(): AiProviders {
  const stt: SttProvider = {
    providerName: 'groq',
    model: 'whisper-large-v3',
    async transcribe() {
      return 'Testowa transkrypcja';
    },
  };
  const llm: LlmProvider = {
    providerName: 'groq',
    model: 'openai/gpt-oss-120b',
    async generateText() {
      return JSON.stringify({
        notes: [
          {
            title: 'Notatka testowa',
            noteType: 'idea',
            category: 'Ogólne',
            tags: ['test'],
            content: 'Treść',
          },
        ],
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
    dimension: 1536,
    async embed() {
      return new Array(1536).fill(0.01);
    },
    async embedBatch(texts: string[]) {
      return texts.map(() => new Array(1536).fill(0.01));
    },
  };

  return {
    stt,
    structure: llm,
    digest: llm,
    link: llm,
    chat: llm,
    embedding,
  };
}

Deno.test('handleProcessRecordingRequest - OPTIONS zwraca 200 i nagłówki CORS', async () => {
  const req = new Request('http://localhost/process-recording', {
    method: 'OPTIONS',
  });

  const res = await handleProcessRecordingRequest(req);
  if (res.status !== 200) {
    throw new Error(`Oczekiwano statusu 200 dla OPTIONS, otrzymano: ${res.status}`);
  }
  if (!res.headers.get('Access-Control-Allow-Origin')) {
    throw new Error('Brak nagłówka Access-Control-Allow-Origin w odpowiedzi OPTIONS');
  }
});

Deno.test('handleProcessRecordingRequest - GET zwraca 405 Method Not Allowed', async () => {
  const req = new Request('http://localhost/process-recording', {
    method: 'GET',
  });

  const res = await handleProcessRecordingRequest(req);
  if (res.status !== 405) {
    throw new Error(`Oczekiwano statusu 405, otrzymano: ${res.status}`);
  }
});

Deno.test('handleProcessRecordingRequest - niepoprawny JSON zwraca 400', async () => {
  const req = new Request('http://localhost/process-recording', {
    method: 'POST',
    body: 'invalid-json',
    headers: { 'Content-Type': 'application/json' },
  });

  const res = await handleProcessRecordingRequest(req);
  if (res.status !== 400) {
    throw new Error(`Oczekiwano statusu 400 dla niepoprawnego JSON, otrzymano: ${res.status}`);
  }
});

Deno.test('handleProcessRecordingRequest - brak recording_id zwraca 400', async () => {
  const req = new Request('http://localhost/process-recording', {
    method: 'POST',
    body: JSON.stringify({ something_else: 123 }),
    headers: { 'Content-Type': 'application/json' },
  });

  const res = await handleProcessRecordingRequest(req);
  if (res.status !== 400) {
    throw new Error(`Oczekiwano statusu 400 dla braku recording_id, otrzymano: ${res.status}`);
  }
});

Deno.test(
  'handleProcessRecordingRequest - poprawny payload z recording_id wywołuje pipeline i zwraca 200',
  async () => {
    const db = new MockDb();
    const storage = new MockStorage();
    const ai = createDummyAiProviders();

    const req = new Request('http://localhost/process-recording', {
      method: 'POST',
      body: JSON.stringify({ recording_id: 'rec-test-123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await handleProcessRecordingRequest(req, {
      dbClientFactory: () => ({ db, storage }),
      aiProvidersFactory: () => ai,
    });

    if (res.status !== 200) {
      const errText = await res.text();
      throw new Error(`Oczekiwano statusu 200, otrzymano ${res.status}: ${errText}`);
    }

    const json = await res.json();
    if (json.status !== 'done' || json.recordingId !== 'rec-test-123') {
      throw new Error(`Nieprawidłowa odpowiedź JSON: ${JSON.stringify(json)}`);
    }
  },
);

Deno.test('handleProcessRecordingRequest - webhook bazy { record: { id } } zwraca 200', async () => {
  const db = new MockDb();
  const storage = new MockStorage();
  const ai = createDummyAiProviders();

  const req = new Request('http://localhost/process-recording', {
    method: 'POST',
    body: JSON.stringify({ type: 'INSERT', table: 'recordings', record: { id: 'rec-test-123' } }),
    headers: { 'Content-Type': 'application/json' },
  });

  const res = await handleProcessRecordingRequest(req, {
    dbClientFactory: () => ({ db, storage }),
    aiProvidersFactory: () => ai,
  });

  if (res.status !== 200) {
    const errText = await res.text();
    throw new Error(`Oczekiwano statusu 200, otrzymano ${res.status}: ${errText}`);
  }

  const json = await res.json();
  if (json.status !== 'done') {
    throw new Error(`Oczekiwano statusu 'done', otrzymano: ${json.status}`);
  }
});
