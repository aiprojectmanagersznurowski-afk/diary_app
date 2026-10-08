import { SupabaseClient } from '@supabase/supabase-js';
import { IUserContextRepository } from '../../domain/repositories/IUserContextRepository';
import { UserContextFile } from '../../domain/models/UserContextFile';

interface UserContextFileRow {
  id: string;
  user_id: string;
  filename: string;
  content: string;
  version: number;
  updated_at: string;
}

export class SupabaseUserContextRepository implements IUserContextRepository {
  constructor(private client: SupabaseClient) {}

  async getContextFiles(userId: string): Promise<UserContextFile[]> {
    const { data, error } = await this.client
      .from('user_context_files')
      .select('id, user_id, filename, content, version, updated_at')
      .eq('user_id', userId)
      .order('filename', { ascending: true });

    if (error) {
      throw new Error(`Błąd pobierania plików kontekstu: ${error.message}`);
    }

    return (data || []).map((row: UserContextFileRow) => ({
      id: row.id,
      userId: row.user_id,
      filename: row.filename,
      content: row.content,
      version: row.version,
      updatedAt: row.updated_at,
    }));
  }

  async saveContextFile(userId: string, filename: string, content: string): Promise<void> {
    const { data: existing } = await this.client
      .from('user_context_files')
      .select('version')
      .eq('user_id', userId)
      .eq('filename', filename)
      .maybeSingle();

    const version = existing ? (existing.version || 1) + 1 : 1;

    const { error } = await this.client.from('user_context_files').upsert(
      {
        user_id: userId,
        filename,
        content,
        version,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id, filename' },
    );

    if (error) {
      throw new Error(`Błąd zapisu pliku kontekstu: ${error.message}`);
    }
  }

  async deleteContextFile(userId: string, filename: string): Promise<void> {
    const { error } = await this.client
      .from('user_context_files')
      .delete()
      .eq('user_id', userId)
      .eq('filename', filename);

    if (error) {
      throw new Error(`Błąd usuwania pliku kontekstu: ${error.message}`);
    }
  }
}
