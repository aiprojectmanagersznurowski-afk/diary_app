export interface RecordingRow {
  id: string;
  user_id: string;
  source: 'phone' | 'watch' | 'web';
  recorded_at: string;
  duration_ms: number | null;
  audio_path: string | null;
  raw_transcript: string | null;
  status: 'uploaded' | 'transcribed' | 'segmented' | 'done' | 'failed';
  attempts: number;
  last_error: string | null;
  created_at?: string;
}

export interface DocumentInsert {
  id: string;
  user_id: string;
  kind: 'note' | 'daily';
  note_type: 'idea' | 'task' | 'reflection' | 'event';
  day: string;
  title: string;
  slug: string;
  data: Record<string, unknown>;
  body_md: string;
  md_path: string;
  category_id: string | null;
  tags: string[];
  recording_id: string;
  schema_version?: number;
}

export interface DocumentChunkInsert {
  id: string;
  document_id: string;
  user_id: string;
  idx: number;
  content: string;
  embedding: number[];
  embedding_model: string;
}

export interface LinkInsert {
  user_id: string;
  source_id: string;
  target_id: string;
  kind: 'semantic' | 'llm' | 'day' | 'wikilink' | 'manual';
  score: number;
  reason: string;
}

export interface CandidateDocument {
  id: string;
  title: string;
  slug: string;
  snippet: string;
}

export interface IDatabaseClient {
  getRecording(id: string): Promise<RecordingRow | null>;
  updateRecording(id: string, updates: Partial<RecordingRow>): Promise<void>;
  getOrCreateCategory(userId: string, categoryName: string): Promise<string | null>;
  slugExists(userId: string, slug: string): Promise<boolean>;
  insertDocuments(docs: DocumentInsert[]): Promise<void>;
  getDocumentsByRecordingId(recordingId: string): Promise<DocumentInsert[]>;
  insertDocumentChunks(chunks: DocumentChunkInsert[]): Promise<void>;
  getCandidateDocuments(userId: string, excludeDocId: string, limit?: number): Promise<CandidateDocument[]>;
  insertLinks(links: LinkInsert[]): Promise<void>;
  upsertDayRebuildQueue(userId: string, day: string): Promise<void>;
}

export interface IStorageClient {
  downloadAudio(path: string): Promise<Uint8Array>;
  uploadMarkdown(path: string, content: string): Promise<void>;
}
