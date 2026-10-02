import { create } from 'zustand';
import { ChatMessage, ChatThread } from '../../domain/models/Chat';
import { IChatRepository } from '../../domain/repositories/IChatRepository';

let activeChatRepository: IChatRepository | null = null;

export const setChatDependencies = (deps: { chatRepository?: IChatRepository | null }) => {
  if (deps.chatRepository !== undefined) {
    activeChatRepository = deps.chatRepository;
  }
};

export const getChatRepository = () => activeChatRepository;

export interface ChatState {
  threads: ChatThread[];
  activeThreadId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  error: string | null;

  loadThreads: () => Promise<void>;
  selectThread: (threadId: string) => Promise<void>;
  startNewThread: () => void;
  sendMessage: (text: string, timezone?: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  isLoadingThreads: false,
  isLoadingMessages: false,
  error: null,

  loadThreads: async () => {
    const repo = getChatRepository();
    if (!repo) return;

    set({ isLoadingThreads: true, error: null });
    try {
      const threads = await repo.getThreads();
      set({ threads, isLoadingThreads: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd ładowania wątków czatu';
      set({ error: msg, isLoadingThreads: false });
    }
  },

  selectThread: async (threadId: string) => {
    const repo = getChatRepository();
    if (!repo) return;

    set({
      activeThreadId: threadId,
      isLoadingMessages: true,
      error: null,
      streamingContent: '',
      isStreaming: false,
    });

    try {
      const messages = await repo.getMessages(threadId);
      set({ messages, isLoadingMessages: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd ładowania wiadomości';
      set({ error: msg, isLoadingMessages: false });
    }
  },

  startNewThread: () => {
    set({
      activeThreadId: null,
      messages: [],
      streamingContent: '',
      isStreaming: false,
      error: null,
    });
  },

  sendMessage: async (text: string, timezone?: string) => {
    const repo = getChatRepository();
    if (!repo) {
      set({ error: 'Brak zainicjalizowanego repozytorium czatu' });
      return;
    }

    const trimmed = text.trim();
    if (!trimmed || get().isStreaming) return;

    const currentThreadId = get().activeThreadId;
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      threadId: currentThreadId || 'pending',
      userId: 'user',
      role: 'user',
      content: trimmed,
      citations: [],
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, tempUserMsg],
      isStreaming: true,
      streamingContent: '',
      error: null,
    }));

    try {
      const result = await repo.sendMessageStreaming({
        message: trimmed,
        threadId: currentThreadId || undefined,
        timezone,
        callbacks: {
          onToken: (token) => {
            set((state) => ({
              streamingContent: state.streamingContent + token,
            }));
          },
        },
      });

      const assistantMsg: ChatMessage = {
        id: result.messageId || `msg-${Date.now()}`,
        threadId: result.threadId,
        userId: 'assistant',
        role: 'assistant',
        content: result.content,
        citations: result.citations,
        createdAt: new Date().toISOString(),
      };

      const wasNewThread = !currentThreadId || currentThreadId !== result.threadId;

      set((state) => ({
        activeThreadId: result.threadId,
        messages: [...state.messages, assistantMsg],
        isStreaming: false,
        streamingContent: '',
      }));

      if (wasNewThread) {
        get().loadThreads();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas wysyłania wiadomości';
      set({
        isStreaming: false,
        streamingContent: '',
        error: msg,
      });
    }
  },

  deleteThread: async (threadId: string) => {
    const repo = getChatRepository();
    if (!repo) return;

    try {
      await repo.deleteThread(threadId);
      set((state) => ({
        threads: state.threads.filter((t) => t.id !== threadId),
        activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
        messages: state.activeThreadId === threadId ? [] : state.messages,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd usuwania wątku';
      set({ error: msg });
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      threads: [],
      activeThreadId: null,
      messages: [],
      isStreaming: false,
      streamingContent: '',
      isLoadingThreads: false,
      isLoadingMessages: false,
      error: null,
    }),
}));
