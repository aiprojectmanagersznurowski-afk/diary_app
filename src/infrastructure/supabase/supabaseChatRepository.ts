import { SupabaseClient } from '@supabase/supabase-js';
import { IChatRepository, StreamChatCallbacks } from '../../domain/repositories/IChatRepository';
import { ChatMessage, ChatThread, Citation } from '../../domain/models/Chat';

export class SupabaseChatRepository implements IChatRepository {
  constructor(
    private client: SupabaseClient,
    private fetchFn: typeof fetch = fetch,
  ) {}

  async getThreads(): Promise<ChatThread[]> {
    const { data, error } = await this.client
      .from('chat_threads')
      .select('id, user_id, title, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Błąd pobierania wątków czatu: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: row.created_at,
    }));
  }

  async getMessages(threadId: string): Promise<ChatMessage[]> {
    const { data, error } = await this.client
      .from('chat_messages')
      .select('id, thread_id, user_id, role, content, citations, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Błąd pobierania wiadomości wątku ${threadId}: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      threadId: row.thread_id,
      userId: row.user_id,
      role: row.role,
      content: row.content,
      citations: (row.citations || []) as Citation[],
      createdAt: row.created_at,
    }));
  }

  async createThread(title?: string): Promise<ChatThread> {
    const { data, error } = await this.client
      .from('chat_threads')
      .insert({ title: title || 'Nowy czat' })
      .select('id, user_id, title, created_at')
      .single();

    if (error || !data) {
      throw new Error(`Błąd tworzenia wątku czatu: ${error?.message || 'Brak danych'}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      createdAt: data.created_at,
    };
  }

  async deleteThread(threadId: string): Promise<void> {
    const { error } = await this.client.from('chat_threads').delete().eq('id', threadId);

    if (error) {
      throw new Error(`Błąd usuwania wątku ${threadId}: ${error.message}`);
    }
  }

  async sendMessageStreaming(params: {
    message: string;
    threadId?: string;
    timezone?: string;
    callbacks?: StreamChatCallbacks;
  }): Promise<{ threadId: string; messageId: string; citations: Citation[]; content: string }> {
    const { data: sessionData } = await this.client.auth.getSession();
    const token = sessionData?.session?.access_token;

    const supabaseUrl =
      (this.client as any).supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey =
      (this.client as any).supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

    const endpoint = `${supabaseUrl}/functions/v1/chat`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.fetchFn(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: params.message,
        thread_id: params.threadId,
        timezone: params.timezone || 'Europe/Warsaw',
      }),
    });

    if (!res.ok) {
      let errorMsg = `Błąd HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson?.error) errorMsg = errJson.error;
      } catch {
        // Ignoruj błąd parsowania JSON błędu
      }
      const error = new Error(errorMsg);
      params.callbacks?.onError?.(error);
      throw error;
    }

    let fullContent = '';
    let resultDone: { threadId: string; messageId: string; citations: Citation[]; content: string } | null = null;

    const handleSseBlock = (block: string) => {
      const trimmed = block.trim();
      if (!trimmed.startsWith('data:')) return;
      const jsonStr = trimmed.replace(/^data:\s*/, '');
      try {
        const event = JSON.parse(jsonStr);
        if (event.type === 'token') {
          fullContent += event.content;
          params.callbacks?.onToken?.(event.content);
        } else if (event.type === 'done') {
          resultDone = {
            threadId: event.thread_id,
            messageId: event.message_id,
            citations: (event.citations || []) as Citation[],
            content: event.content || fullContent,
          };
          params.callbacks?.onDone?.(resultDone);
        } else if (event.type === 'error') {
          const streamErr = new Error(event.error || 'Błąd strumieniowania odpowiedzi');
          params.callbacks?.onError?.(streamErr);
          throw streamErr;
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Błąd strumieniowania')) {
          throw err;
        }
      }
    };

    // Obsługa strumienia ReadableStream lub fallback do text()
    if (res.body && typeof (res.body as any).getReader === 'function') {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const block of parts) {
          handleSseBlock(block);
        }
      }

      if (buffer.trim()) {
        handleSseBlock(buffer);
      }
    } else {
      const fullText = await res.text();
      for (const block of fullText.split('\n\n')) {
        handleSseBlock(block);
      }
    }

    if (!resultDone) {
      // Fallback jeśli zdarzenie done nie dotarło poprawnie
      resultDone = {
        threadId: params.threadId || '',
        messageId: '',
        citations: [],
        content: fullContent,
      };
    }

    return resultDone;
  }
}
