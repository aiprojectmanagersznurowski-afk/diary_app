import { NoteType } from './NoteDocument';

export type RelationType = 'semantic' | 'day' | 'wikilink' | 'llm' | 'manual';

export interface RelatedThought {
  documentId: string;
  title: string;
  kind: 'note' | 'daily';
  noteType?: NoteType | null;
  day: string; // YYYY-MM-DD
  slug?: string | null;
  categoryId?: string | null;
  relationType: RelationType;
  similarity: number;
  reason?: string | null;
}

export function getRelationTypeLabel(type: RelationType): string {
  switch (type) {
    case 'semantic':
      return 'Podobieństwo tematyczne';
    case 'day':
      return 'Ten sam dzień';
    case 'wikilink':
      return 'Odnośnik w tekście';
    case 'llm':
      return 'Powiązanie AI';
    case 'manual':
      return 'Powiązanie ręczne';
    default:
      return 'Powiązanie';
  }
}

export function getRelationTypeIcon(type: RelationType): string {
  switch (type) {
    case 'semantic':
      return 'cpu';
    case 'day':
      return 'calendar';
    case 'wikilink':
      return 'link';
    case 'llm':
      return 'zap';
    case 'manual':
      return 'edit-3';
    default:
      return 'share-2';
  }
}
