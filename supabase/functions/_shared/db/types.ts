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
  note_type: 'idea' | 'task' | 'reflection' | 'event' | null;
  day: string;
  title: string;
  slug: string;
  data: Record<string, unknown>;
  body_md: string;
  md_path: string;
  category_id: string | null;
  tags: string[];
  recording_id: string | null;
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

// ── build-daily types ──────────────────────────────────────────────────

export interface ProfileRow {
  user_id: string;
  life_goals: string[] | null;
  ai_personality: string | null;
  timezone: string;
  current_streak: number;
  last_entry_day: string | null; // date as YYYY-MM-DD
  badges: string[] | null;
}

export interface NoteRow {
  id: string;
  title: string;
  note_type: 'idea' | 'task' | 'reflection' | 'event';
  body_md: string;
  slug: string;
  tags: string[];
  created_at: string;
  recording_id: string | null;
}

export interface RecordingSummary {
  id: string;
  recorded_at: string;
}

export interface ContextProposalInsert {
  user_id: string;
  filename: string;
  section: string;
  action: 'add' | 'update' | 'remove';
  diff_content: string;
  source_quote?: string | null;
  source_document_id?: string | null;
  confidence: number;
  status: 'pending' | 'applied' | 'rejected';
}

export interface IBuildDailyDatabaseClient {
  /** User profile: goals, personality, streak. */
  getProfile(userId: string): Promise<ProfileRow | null>;
  /** All notes (kind='note') for a given user+day, oldest first. */
  getNotesForDay(userId: string, day: string): Promise<NoteRow[]>;
  /** Existing daily document for a given user+day (kind='daily'), so a rebuild reuses its id. */
  getDailyDocument(userId: string, day: string): Promise<DocumentInsert | null>;
  /** Upsert daily document (kind='daily') by id, so rebuilds never change the row's id. */
  upsertDailyDocument(doc: DocumentInsert): Promise<void>;
  /** Delete and re-insert chunks for a daily document (idempotent rebuild). */
  replaceDocumentChunks(documentId: string, chunks: DocumentChunkInsert[]): Promise<void>;
  /** Replace all 'day' links from a daily doc to its notes. */
  replaceDayLinks(userId: string, dailyDocId: string, noteIds: string[]): Promise<void>;
  /** Update streak/last_entry_day/badges in profile. */
  updateProfile(userId: string, updates: Partial<ProfileRow>): Promise<void>;
  /** Remove the day_rebuild_queue entry once its build has been handled (success or no notes). */
  deleteDayRebuildQueueEntry(userId: string, day: string): Promise<void>;
  /** Recording summaries for a set of ids (for the "Nagrania dnia" section). */
  getRecordingsByIds(ids: string[]): Promise<RecordingSummary[]>;
  /** Upload markdown to Storage. */
  uploadMarkdown(path: string, content: string): Promise<void>;
  /** Insert candidate updates into user_context_proposals (F10-06 / ADR-011). */
  insertContextProposals?(proposals: ContextProposalInsert[]): Promise<void>;
}
