export interface Citation {
  documentId: string;
  title: string;
  day: string;
  kind: string;
  noteType: string | null;
  snippet: string;
}

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  threadId: string;
  userId: string;
  role: ChatMessageRole;
  content: string;
  citations: Citation[];
  createdAt: string;
}

export interface ChatThread {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
}
