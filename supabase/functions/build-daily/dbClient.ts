/* eslint-disable import/no-unresolved */
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  IBuildDailyDatabaseClient,
  DocumentInsert,
  DocumentChunkInsert,
  ProfileRow,
  NoteRow,
  RecordingSummary,
} from '../_shared/db/types.ts';

export class SupabaseBuildDailyClient implements IBuildDailyDatabaseClient {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async getProfile(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await this.client.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (error) {
      throw new Error(`Błąd pobierania profilu ${userId}: ${error.message}`);
    }
    return data as ProfileRow | null;
  }

  async getNotesForDay(userId: string, day: string): Promise<NoteRow[]> {
    const { data, error } = await this.client
      .from('documents')
      .select('id, title, note_type, body_md, slug, tags, created_at, recording_id')
      .eq('user_id', userId)
      .eq('day', day)
      .eq('kind', 'note')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Błąd pobierania notatek dnia ${day}: ${error.message}`);
    }
    return (data || []) as NoteRow[];
  }

  async getDailyDocument(userId: string, day: string): Promise<DocumentInsert | null> {
    const { data, error } = await this.client
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('day', day)
      .eq('kind', 'daily')
      .maybeSingle();

    if (error) {
      throw new Error(`Błąd pobierania wpisu dnia ${day}: ${error.message}`);
    }
    return data as DocumentInsert | null;
  }

  async upsertDailyDocument(doc: DocumentInsert): Promise<void> {
    // Zawsze po `id`: wpis dnia musi zachować ten sam wiersz (a więc i id) między przebudowami,
    // bo document_chunks/links wskazują na documents.id bez ON UPDATE CASCADE.
    const { error } = await this.client.from('documents').upsert(doc, { onConflict: 'id' });
    if (error) {
      throw new Error(`Błąd zapisu wpisu dnia ${doc.day}: ${error.message}`);
    }
  }

  async replaceDocumentChunks(documentId: string, chunks: DocumentChunkInsert[]): Promise<void> {
    const { error: deleteError } = await this.client.from('document_chunks').delete().eq('document_id', documentId);
    if (deleteError) {
      throw new Error(`Błąd usuwania starych chunków dokumentu ${documentId}: ${deleteError.message}`);
    }

    if (chunks.length === 0) return;

    const { error: insertError } = await this.client.from('document_chunks').insert(chunks);
    if (insertError) {
      throw new Error(`Błąd wstawiania chunków dokumentu ${documentId}: ${insertError.message}`);
    }
  }

  async replaceDayLinks(userId: string, dailyDocId: string, noteIds: string[]): Promise<void> {
    const { error: deleteError } = await this.client
      .from('links')
      .delete()
      .eq('user_id', userId)
      .eq('source_id', dailyDocId)
      .eq('kind', 'day');

    if (deleteError) {
      throw new Error(`Błąd usuwania starych powiązań wpisu dnia ${dailyDocId}: ${deleteError.message}`);
    }

    if (noteIds.length === 0) return;

    const links = noteIds.map((targetId) => ({
      user_id: userId,
      source_id: dailyDocId,
      target_id: targetId,
      kind: 'day' as const,
      score: 1,
      reason: 'notatka z tego dnia',
    }));

    const { error: insertError } = await this.client.from('links').insert(links);
    if (insertError) {
      throw new Error(`Błąd wstawiania powiązań wpisu dnia ${dailyDocId}: ${insertError.message}`);
    }
  }

  async updateProfile(userId: string, updates: Partial<ProfileRow>): Promise<void> {
    const { error } = await this.client.from('profiles').update(updates).eq('user_id', userId);
    if (error) {
      throw new Error(`Błąd aktualizacji profilu ${userId}: ${error.message}`);
    }
  }

  async deleteDayRebuildQueueEntry(userId: string, day: string): Promise<void> {
    const { error } = await this.client.from('day_rebuild_queue').delete().eq('user_id', userId).eq('day', day);

    if (error) {
      throw new Error(`Błąd usuwania wpisu z kolejki przebudowy dnia ${day}: ${error.message}`);
    }
  }

  async getRecordingsByIds(ids: string[]): Promise<RecordingSummary[]> {
    if (ids.length === 0) return [];

    const { data, error } = await this.client.from('recordings').select('id, recorded_at').in('id', ids);
    if (error) {
      throw new Error(`Błąd pobierania nagrań: ${error.message}`);
    }
    return (data || []) as RecordingSummary[];
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

export function createBuildDailyClient(): IBuildDailyDatabaseClient {
  const url = (globalThis as any).Deno?.env?.get('SUPABASE_URL') || '';
  const key = (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!url || !key) {
    throw new Error('Brak zmiennych SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY');
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return new SupabaseBuildDailyClient(client);
}
