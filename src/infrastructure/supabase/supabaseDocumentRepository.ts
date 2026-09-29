import { SupabaseClient } from '@supabase/supabase-js';
import { IDocumentRepository, AnyDocument } from '../../domain/repositories/IDocumentRepository';
import { DailyDocument } from '../../domain/models/DailyDocument';
import { mapRowToNoteDocument } from './supabaseNoteRepository';

const DOCUMENT_COLUMNS =
  'id, user_id, kind, note_type, day, title, slug, body_md, md_path, data, category_id, tags, recording_id, created_at, categories(name)';

export class SupabaseDocumentRepository implements IDocumentRepository {
  constructor(private client: SupabaseClient) {}

  async getDocumentById(id: string): Promise<AnyDocument | null> {
    const { data, error } = await this.client.from('documents').select(DOCUMENT_COLUMNS).eq('id', id).maybeSingle();

    if (error) {
      throw new Error(`Błąd pobierania dokumentu ${id}: ${error.message}`);
    }
    if (!data) return null;

    return data.kind === 'note' ? mapRowToNoteDocument(data) : mapRowToDailyDocument(data);
  }
}

export function mapRowToDailyDocument(row: Record<string, any>): DailyDocument {
  const d = (row.data as Record<string, any>) || {};

  return {
    id: row.id,
    userId: row.user_id,
    kind: 'daily',
    day: row.day,
    bodyMd: row.body_md || '',
    mdPath: row.md_path || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    dominantThought: d.dominantThought || '',
    summary: d.summary || '',
    quotes: Array.isArray(d.quotes) ? d.quotes : [],
    impactOnGoals: d.impactOnGoals || '',
    goalImpactType: d.goalImpactType || 'neutral',
    completedTasks: Array.isArray(d.completedTasks) ? d.completedTasks : [],
    importantEvents: Array.isArray(d.importantEvents) ? d.importantEvents : [],
    emotions: Array.isArray(d.emotions) ? d.emotions : [],
    emotionTriggers: Array.isArray(d.emotionTriggers) ? d.emotionTriggers : [],
    fatigueLevel: typeof d.fatigueLevel === 'number' ? d.fatigueLevel : 0,
    stressVsCalm: d.stressVsCalm || 'neutral',
    gratefulFor: d.gratefulFor || '',
    goalAdvice: d.goalAdvice ?? null,
    ideas: Array.isArray(d.ideas) ? d.ideas : [],
    createdAt: row.created_at || new Date().toISOString(),
  };
}
