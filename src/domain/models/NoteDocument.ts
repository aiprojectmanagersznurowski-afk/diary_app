export type NoteType = 'idea' | 'task' | 'reflection' | 'event';

export interface NoteDocument {
  id: string;
  userId: string;
  kind: 'note';
  noteType: NoteType;
  day: string; // YYYY-MM-DD
  title: string;
  slug: string;
  bodyMd: string;
  content: string; // oczyszczona treść notatki
  categoryName?: string | null;
  categoryId?: string | null;
  tags: string[];
  recordingId?: string | null;
  createdAt: string;
}

export function getNoteTypeLabel(type: NoteType): string {
  switch (type) {
    case 'idea':
      return 'Pomysł';
    case 'task':
      return 'Zadanie';
    case 'reflection':
      return 'Refleksja';
    case 'event':
      return 'Wydarzenie';
    default:
      return 'Notatka';
  }
}

export function getNoteTypeColor(type: NoteType): string {
  switch (type) {
    case 'idea':
      return '#FBBF24'; // bursztynowy / złoty
    case 'task':
      return '#60A5FA'; // niebieski
    case 'reflection':
      return '#A78BFA'; // fioletowy
    case 'event':
      return '#34D399'; // szmaragdowy
    default:
      return '#9CA3AF';
  }
}

export function getNoteTypeIcon(type: NoteType): string {
  switch (type) {
    case 'idea':
      return 'lightbulb';
    case 'task':
      return 'check-circle';
    case 'reflection':
      return 'feather';
    case 'event':
      return 'calendar';
    default:
      return 'file-text';
  }
}
