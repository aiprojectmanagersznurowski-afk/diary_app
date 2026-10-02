import { ChatMessage, ChatThread, Citation } from '../models/Chat';

export interface StreamChatCallbacks {
  onToken?: (token: string) => void;
  onDone?: (payload: { threadId: string; messageId: string; citations: Citation[]; content: string }) => void;
  onError?: (error: Error) => void;
}

export interface IChatRepository {
  /**
   * Pobiera listę wątków użytkownika, posortowaną od najnowszych.
   */
  getThreads(): Promise<ChatThread[]>;

  /**
   * Pobiera wiadomości dla danego wątku w kolejności chronologicznej.
   */
  getMessages(threadId: string): Promise<ChatMessage[]>;

  /**
   * Tworzy nowy wątek czatu.
   */
  createThread(title?: string): Promise<ChatThread>;

  /**
   * Usuwa wątek czatu.
   */
  deleteThread(threadId: string): Promise<void>;

  /**
   * Wysyła wiadomość do Edge Function chat i strumieniuje odpowiedź protokołem SSE.
   * Zwraca dane ukończonej odpowiedzi asystenta.
   */
  sendMessageStreaming(params: {
    message: string;
    threadId?: string;
    timezone?: string;
    callbacks?: StreamChatCallbacks;
  }): Promise<{ threadId: string; messageId: string; citations: Citation[]; content: string }>;
}
