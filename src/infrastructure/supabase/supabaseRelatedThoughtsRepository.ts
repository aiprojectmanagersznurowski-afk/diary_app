import { SupabaseClient } from '@supabase/supabase-js';
import { IRelatedThoughtsRepository } from '../../domain/repositories/IRelatedThoughtsRepository';
import { RelatedThought, RelationType } from '../../domain/models/RelatedThought';

export class SupabaseRelatedThoughtsRepository implements IRelatedThoughtsRepository {
  constructor(private client: SupabaseClient) {}

  async getRelatedThoughts(documentId: string, limit = 5): Promise<RelatedThought[]> {
    if (!documentId) {
      return [];
    }

    const { data, error } = await this.client.rpc('similar_documents', {
      document_id: documentId,
      k: limit,
    });

    if (error) {
      throw new Error(`Błąd pobierania powiązanych myśli: ${error.message}`);
    }

    const rows = (data || []) as Record<string, any>[];

    return rows.map((row) => ({
      documentId: row.id,
      title: row.title || '',
      kind: row.kind,
      noteType: row.note_type ?? null,
      day: row.day,
      slug: row.slug ?? null,
      categoryId: row.category_id ?? null,
      relationType: (row.relation_type as RelationType) || 'semantic',
      similarity: typeof row.similarity === 'number' ? row.similarity : 1.0,
      reason: row.reason ?? null,
    }));
  }
}
