/* eslint-disable import/no-unresolved */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  IDatabaseClient,
  IStorageClient,
  RecordingRow,
  DocumentInsert,
  DocumentChunkInsert,
  LinkInsert,
  CandidateDocument,
} from './types.ts';

export class RealSupabaseDatabaseClient implements IDatabaseClient {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getRecording(id: string): Promise<RecordingRow | null> {
    const { data, error } = await this.client.from('recordings').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw new Error(`Błąd pobierania nagrania ${id}: ${error.message}`);
    }
    return data as RecordingRow | null;
  }

  async updateRecording(id: string, updates: Partial<RecordingRow>): Promise<void> {
    const { error } = await this.client.from('recordings').update(updates).eq('id', id);

    if (error) {
      throw new Error(`Błąd aktualizacji nagrania ${id}: ${error.message}`);
    }
  }

  async getOrCreateCategory(userId: string, categoryName: string): Promise<string | null> {
    const trimmed = categoryName.trim();
    if (!trimmed) return null;

    const { data: existing, error: selectErr } = await this.client
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', trimmed)
      .maybeSingle();

    if (selectErr) {
      throw new Error(`Błąd odczytu kategorii: ${selectErr.message}`);
    }
    if (existing) {
      return existing.id;
    }

    const { data: inserted, error: insertErr } = await this.client
      .from('categories')
      .insert({ user_id: userId, name: trimmed })
      .select('id')
      .single();

    if (insertErr) {
      // W razie równoległego wstawienia (23505) spróbuj ponownie odczytać
      if (insertErr.code === '23505') {
        const { data: retryData } = await this.client
          .from('categories')
          .select('id')
          .eq('user_id', userId)
          .eq('name', trimmed)
          .maybeSingle();
        return retryData?.id ?? null;
      }
      throw new Error(`Błąd tworzenia kategorii: ${insertErr.message}`);
    }

    return inserted.id;
  }

  async slugExists(userId: string, slug: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('documents')
      .select('id')
      .eq('user_id', userId)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw new Error(`Błąd sprawdzania sluga: ${error.message}`);
    }
    return !!data;
  }

  async insertDocuments(docs: DocumentInsert[]): Promise<void> {
    if (docs.length === 0) return;

    const { error } = await this.client.from('documents').upsert(docs, { onConflict: 'user_id, slug' });

    if (error) {
      throw new Error(`Błąd wstawiania dokumentów: ${error.message}`);
    }
  }

  async getDocumentsByRecordingId(recordingId: string): Promise<DocumentInsert[]> {
    const { data, error } = await this.client.from('documents').select('*').eq('recording_id', recordingId);

    if (error) {
      throw new Error(`Błąd pobierania dokumentów nagrania: ${error.message}`);
    }
    return (data || []) as DocumentInsert[];
  }

  async insertDocumentChunks(chunks: DocumentChunkInsert[]): Promise<void> {
    if (chunks.length === 0) return;

    const { error } = await this.client.from('document_chunks').upsert(chunks, { onConflict: 'document_id, idx' });

    if (error) {
      throw new Error(`Błąd wstawiania chunków dokumentu: ${error.message}`);
    }
  }

  async getCandidateDocuments(userId: string, excludeDocId: string, limit: number = 10): Promise<CandidateDocument[]> {
    const { data, error } = await this.client
      .from('documents')
      .select('id, title, slug, body_md')
      .eq('user_id', userId)
      .eq('kind', 'note')
      .neq('id', excludeDocId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Błąd pobierania kandydatów na powiązania: ${error.message}`);
    }

    return (data || []).map((d) => ({
      id: d.id,
      title: d.title,
      slug: d.slug,
      snippet: (d.body_md || '').slice(0, 300),
    }));
  }

  async insertLinks(links: LinkInsert[]): Promise<void> {
    if (links.length === 0) return;

    const { error } = await this.client.from('links').upsert(links, { onConflict: 'source_id, target_id, kind' });

    if (error) {
      throw new Error(`Błąd wstawiania powiązań: ${error.message}`);
    }
  }

  async upsertDayRebuildQueue(userId: string, day: string): Promise<void> {
    const { error } = await this.client
      .from('day_rebuild_queue')
      .upsert({ user_id: userId, day, requested_at: new Date().toISOString() }, { onConflict: 'user_id, day' });

    if (error) {
      throw new Error(`Błąd zapisu do kolejki przebudowy dnia: ${error.message}`);
    }
  }
}

export class RealSupabaseStorageClient implements IStorageClient {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async downloadAudio(path: string): Promise<Uint8Array> {
    const { data, error } = await this.client.storage.from('recordings').download(path);
    if (error || !data) {
      throw new Error(`Błąd pobierania pliku audio (${path}): ${error?.message || 'Brak danych'}`);
    }
    const buffer = await data.arrayBuffer();
    return new Uint8Array(buffer);
  }

  async uploadMarkdown(path: string, content: string): Promise<void> {
    const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' });
    const { error } = await this.client.storage.from('documents').upload(path, blob, {
      contentType: 'text/markdown; charset=utf-8',
      upsert: true,
    });

    if (error) {
      throw new Error(`Błąd zapisu pliku Markdown (${path}): ${error.message}`);
    }
  }
}

export function createSupabaseClients(): { db: IDatabaseClient; storage: IStorageClient } {
  const url = (globalThis as any).Deno?.env?.get('SUPABASE_URL') || '';
  const key = (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!url || !key) {
    throw new Error('Brak zmiennych SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY');
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    db: new RealSupabaseDatabaseClient(client),
    storage: new RealSupabaseStorageClient(client),
  };
}
