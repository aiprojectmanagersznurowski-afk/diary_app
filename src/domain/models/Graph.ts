import { NoteType } from './NoteDocument';

export interface GraphNode {
  id: string;
  kind: 'note' | 'daily';
  noteType?: NoteType | null;
  day: string; // YYYY-MM-DD
  title: string;
  slug: string;
  categoryId?: string | null;
  tags: string[];
  createdAt: string;
}

export type LinkKind = 'semantic' | 'llm' | 'day' | 'wikilink' | 'manual';

export interface GraphEdge {
  source: string; // ID węzła źródłowego (react-force-graph)
  target: string; // ID węzła docelowego (react-force-graph)
  sourceId: string;
  targetId: string;
  kind: LinkKind;
  score?: number | null;
  reason?: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface GraphFilters {
  dateFrom?: string | null;
  dateTo?: string | null;
  categoryIds?: string[] | null;
  noteTypes?: NoteType[] | null;
  minScore?: number | null;
}
