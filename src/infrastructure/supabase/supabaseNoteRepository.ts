import { SupabaseClient } from '@supabase/supabase-js';
import { INoteRepository } from '../../domain/repositories/INoteRepository';
import { NoteDocument, NoteType } from '../../domain/models/NoteDocument';

export class SupabaseNoteRepository implements INoteRepository {
  constructor(private client: SupabaseClient) {}

  async getNotes(day?: string): Promise<NoteDocument[]> {
    let query = this.client
      .from('documents')
      .select(
        'id, user_id, kind, note_type, day, title, slug, body_md, data, category_id, tags, recording_id, created_at, categories(name)',
      )
      .eq('kind', 'note')
      .order('created_at', { ascending: false });

    if (day) {
      query = query.eq('day', day);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Błąd pobierania notatek: ${error.message}`);
    }

    return (data || []).map(mapRowToNoteDocument);
  }

  subscribeToNotes(userId: string, onUpdate: (note: NoteDocument) => void): () => void {
    const channel = this.client
      .channel(`notes-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const row = payload.new as Record<string, any>;
            if (row.id && row.kind === 'note') {
              onUpdate(mapRowToNoteDocument(row));
            }
          }
        },
      )
      .subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }
}

export function mapRowToNoteDocument(row: Record<string, any>): NoteDocument {
  const categoryName = row.categories?.name || (row.data as any)?.category || null;

  // Treść oczyszczona: wyodrębniamy z body_md (po frontmatterze i nagłówku #) lub z data.content
  let content = (row.data as any)?.content || '';
  if (!content && row.body_md) {
    const withoutFrontmatter = row.body_md.replace(/^---[\s\S]*?---\n*/, '').trim();
    content = withoutFrontmatter.replace(/^#\s+[^\n]*\n*/, '').trim();
  }

  return {
    id: row.id,
    userId: row.user_id,
    kind: 'note',
    noteType: (row.note_type as NoteType) || 'idea',
    day: row.day,
    title: row.title || 'Bez tytułu',
    slug: row.slug || '',
    bodyMd: row.body_md || '',
    content,
    categoryName,
    categoryId: row.category_id,
    tags: Array.isArray(row.tags) ? row.tags : [],
    recordingId: row.recording_id,
    createdAt: row.created_at || new Date().toISOString(),
  };
}
