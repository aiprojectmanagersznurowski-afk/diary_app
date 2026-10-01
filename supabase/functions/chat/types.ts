export interface Citation {
  documentId: string;
  title: string;
  day: string;
  kind: string;
  noteType: string | null;
  snippet: string;
}

export interface SearchChunkResult {
  id: string;
  document_id: string;
  content: string;
  idx: number;
  day: string;
  kind: string;
  note_type: string | null;
  title: string | null;
  slug: string | null;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  similarity: number;
}

export interface ChatSearchFilters {
  queryEmbedding?: number[] | null;
  queryText?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  kinds?: string[] | null;
  categoryIds?: string[] | null;
  k?: number;
}

export interface ChatRequestBody {
  message: string;
  thread_id?: string;
  timezone?: string;
  current_date?: string;
}

export interface IChatDatabaseClient {
  getUserId(authHeader?: string): Promise<string | null>;
  searchChunks(userId: string, filters: ChatSearchFilters): Promise<SearchChunkResult[]>;
  resolveCategoryIds(userId: string, categoryNames: string[]): Promise<string[]>;
  getOrCreateThread(userId: string, threadId?: string, initialTitle?: string): Promise<string>;
  saveMessage(params: {
    threadId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
  }): Promise<{ id: string; created_at: string }>;
  getUserProfile(userId: string): Promise<{ timezone?: string } | null>;
}

export interface ChatTokenEvent {
  type: 'token';
  content: string;
}

export interface ChatDoneEvent {
  type: 'done';
  thread_id: string;
  message_id: string;
  citations: Citation[];
  content: string;
}

export interface ChatErrorEvent {
  type: 'error';
  error: string;
}

export type ChatStreamEvent = ChatTokenEvent | ChatDoneEvent | ChatErrorEvent;
