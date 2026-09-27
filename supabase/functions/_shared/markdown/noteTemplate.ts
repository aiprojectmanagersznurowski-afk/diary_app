export interface NoteMetadata {
  id: string;
  title: string;
  noteType: 'idea' | 'task' | 'reflection' | 'event';
  day: string; // YYYY-MM-DD
  recordedAt: string; // ISO 8601
  category?: string | null;
  tags?: string[];
  related?: { slug: string; title: string }[];
  source?: 'phone' | 'watch' | 'web';
  content: string;
}

const POLISH_CHAR_MAP: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
  Ą: 'a',
  Ć: 'c',
  Ę: 'e',
  Ł: 'l',
  Ń: 'n',
  Ó: 'o',
  Ś: 's',
  Ź: 'z',
  Ż: 'z',
};

/**
 * Zamienia polskie znaki na ich odpowiedniki ASCII.
 */
export function removePolishDiacritics(text: string): string {
  return text
    .split('')
    .map((char) => POLISH_CHAR_MAP[char] || char)
    .join('');
}

/**
 * Generuje niezmienny slug pliku notatki w formacie:
 * {YYYY-MM-DD}-{slug-tytulu}[-{suffix}]
 */
export function generateNoteSlug(day: string, title: string, idSuffix?: string): string {
  const normalized = removePolishDiacritics(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  const baseSlug = normalized ? `${day}-${normalized}` : day;
  if (idSuffix) {
    const cleanSuffix = idSuffix
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 6)
      .toLowerCase();
    return `${baseSlug}-${cleanSuffix}`;
  }
  return baseSlug;
}

/**
 * Renderuje treść pliku Markdown notatki ściśle według specyfikacji z docs/02-architektura.md §5.
 * Nie używa LLM do renderowania Markdowna (ADR-004).
 */
export function renderNoteMarkdown(meta: NoteMetadata): string {
  const lines: string[] = ['---'];
  lines.push('type: note');
  lines.push(`id: ${meta.id}`);
  lines.push(`note_type: ${meta.noteType}`);
  lines.push(`date: ${meta.day}`);
  lines.push(`recorded_at: ${meta.recordedAt}`);

  if (meta.category) {
    lines.push(`category: ${meta.category}`);
  }

  const tags = meta.tags ?? [];
  lines.push(`tags: [${tags.join(', ')}]`);

  lines.push(`daily: "[[${meta.day}]]"`);

  const related = meta.related ?? [];
  if (related.length > 0) {
    const relatedLinks = related.map((r) => `"[[${r.slug}|${r.title}]]"`).join(', ');
    lines.push(`related: [${relatedLinks}]`);
  } else {
    lines.push('related: []');
  }

  if (meta.source) {
    lines.push(`source: ${meta.source}`);
  }

  lines.push('---');
  lines.push(`# ${meta.title}`);
  lines.push('');
  lines.push(meta.content.trim());
  lines.push('');

  return lines.join('\n');
}
