/* eslint-disable import/no-unresolved */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { IChatDatabaseClient, ChatSearchFilters, SearchChunkResult, Citation } from './types.ts';

export class RealChatDatabaseClient implements IChatDatabaseClient {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getUserId(authHeader?: string): Promise<string | null> {
    if (!authHeader) return null;
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;

    const {
      data: { user },
      error,
    } = await this.client.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user.id;
  }

  async searchChunks(userId: string, filters: ChatSearchFilters): Promise<SearchChunkResult[]> {
    const { data, error } = await this.client.rpc('search_chunks', {
      query_embedding: filters.queryEmbedding ?? null,
      query_text: filters.queryText ?? null,
      date_from: filters.dateFrom ?? null,
      date_to: filters.dateTo ?? null,
      kinds: filters.kinds ?? null,
      category_ids: filters.categoryIds ?? null,
      k: filters.k ?? 10,
    });

    if (error) {
      throw new Error(`Błąd RPC search_chunks: ${error.message}`);
    }

    return (data || []) as SearchChunkResult[];
  }

  async resolveCategoryIds(userId: string, categoryNames: string[]): Promise<string[]> {
    if (!categoryNames || categoryNames.length === 0) return [];

    const { data, error } = await this.client
      .from('categories')
      .select('id, name')
      .eq('user_id', userId)
      .in('name', categoryNames);

    if (error) {
      throw new Error(`Błąd wyszukiwania kategorii: ${error.message}`);
    }

    return (data || []).map((c) => c.id);
  }

  async getOrCreateThread(userId: string, threadId?: string, initialTitle?: string): Promise<string> {
    if (threadId) {
      const { data, error } = await this.client
        .from('chat_threads')
        .select('id')
        .eq('id', threadId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw new Error(`Błąd sprawdzania wątku czatu: ${error.message}`);
      }
      if (data) {
        return data.id;
      }
    }

    const title = initialTitle ? initialTitle.slice(0, 50).trim() || 'Czat' : 'Czat';
    const { data: inserted, error: insertErr } = await this.client
      .from('chat_threads')
      .insert({ user_id: userId, title })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      throw new Error(`Błąd tworzenia wątku czatu: ${insertErr?.message || 'Brak danych'}`);
    }

    return inserted.id;
  }

  async saveMessage(params: {
    threadId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: Citation[];
  }): Promise<{ id: string; created_at: string }> {
    const { data, error } = await this.client
      .from('chat_messages')
      .insert({
        thread_id: params.threadId,
        user_id: params.userId,
        role: params.role,
        content: params.content,
        citations: params.citations ?? [],
      })
      .select('id, created_at')
      .single();

    if (error || !data) {
      throw new Error(`Błąd zapisu wiadomości czatu: ${error?.message || 'Brak danych'}`);
    }

    return { id: data.id, created_at: data.created_at };
  }

  async getUserProfile(userId: string): Promise<{ timezone?: string } | null> {
    const { data, error } = await this.client.from('profiles').select('timezone').eq('user_id', userId).maybeSingle();

    if (error) {
      return null;
    }

    return data || null;
  }
}

export function createChatDatabaseClient(authHeader?: string): IChatDatabaseClient {
  const url = (globalThis as any).Deno?.env?.get('SUPABASE_URL') || '';
  const anonKey = (globalThis as any).Deno?.env?.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const key = authHeader ? anonKey || serviceKey : serviceKey;

  if (!url || !key) {
    throw new Error('Brak zmiennych SUPABASE_URL lub klucza Supabase');
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  });

  return new RealChatDatabaseClient(client);
}
