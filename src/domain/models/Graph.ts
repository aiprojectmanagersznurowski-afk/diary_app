import { NoteType, getNoteTypeColor } from './NoteDocument';

export interface GraphNode {
  id: string;
  kind: 'note' | 'daily';
  noteType?: NoteType | null;
  day: string; // YYYY-MM-DD
  title: string;
  slug: string;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  tags: string[];
  createdAt: string;
  val?: number;
  color?: string;
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

export interface GraphCategory {
  id: string;
  name: string;
  color?: string | null;
}

export interface GraphFilters {
  dateFrom?: string | null;
  dateTo?: string | null;
  categoryIds?: string[] | null;
  noteTypes?: NoteType[] | null;
  minScore?: number | null;
}

export function getNodeColor(node: GraphNode, categoryColorMap?: Record<string, string>): string {
  if (node.kind === 'daily') {
    return '#38BDF8'; // Wpis dnia jako węzeł centralny: błękitny / cyjan
  }
  if (node.categoryColor) {
    return node.categoryColor;
  }
  if (node.categoryId && categoryColorMap?.[node.categoryId]) {
    return categoryColorMap[node.categoryId];
  }
  if (node.noteType) {
    return getNoteTypeColor(node.noteType);
  }
  return '#94A3B8';
}

export function getNodeSize(node: GraphNode): number {
  return node.kind === 'daily' ? 12 : 5;
}
