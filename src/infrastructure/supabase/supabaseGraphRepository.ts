import { SupabaseClient } from '@supabase/supabase-js';
import { IGraphRepository } from '../../domain/repositories/IGraphRepository';
import { GraphData, GraphEdge, GraphFilters, GraphNode } from '../../domain/models/Graph';

export class SupabaseGraphRepository implements IGraphRepository {
  constructor(private client: SupabaseClient) {}

  async getGraph(filters?: GraphFilters): Promise<GraphData> {
    const { data, error } = await this.client.rpc('get_graph', {
      date_from: filters?.dateFrom ?? null,
      date_to: filters?.dateTo ?? null,
      category_ids: filters?.categoryIds && filters.categoryIds.length > 0 ? filters.categoryIds : null,
      note_types: filters?.noteTypes && filters.noteTypes.length > 0 ? filters.noteTypes : null,
      min_score: filters?.minScore ?? null,
    });

    if (error) {
      throw new Error(`Błąd pobierania grafu: ${error.message}`);
    }

    const rawNodes = (data?.nodes || []) as Record<string, any>[];
    const rawLinks = (data?.links || []) as Record<string, any>[];

    const nodes: GraphNode[] = rawNodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      noteType: n.note_type ?? null,
      day: n.day,
      title: n.title || '',
      slug: n.slug || '',
      categoryId: n.category_id ?? null,
      tags: Array.isArray(n.tags) ? n.tags : [],
      createdAt: n.created_at || '',
    }));

    const links: GraphEdge[] = rawLinks.map((l) => ({
      source: l.source || l.source_id,
      target: l.target || l.target_id,
      sourceId: l.source_id,
      targetId: l.target_id,
      kind: l.kind,
      score: typeof l.score === 'number' ? l.score : null,
      reason: l.reason ?? null,
    }));

    return { nodes, links };
  }
}
