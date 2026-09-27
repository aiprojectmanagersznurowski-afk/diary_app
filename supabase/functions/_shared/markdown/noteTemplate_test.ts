import { renderNoteMarkdown, generateNoteSlug, removePolishDiacritics } from './noteTemplate.ts';

Deno.test('removePolishDiacritics - poprawnie zamienia polskie znaki', () => {
  const result = removePolishDiacritics('Zażółć gęślą jaźń');
  if (result !== 'Zazolc gesla jazn') {
    throw new Error(`Oczekiwano "Zazolc gesla jazn", otrzymano "${result}"`);
  }
});

Deno.test('generateNoteSlug - generuje poprawny slug z daty i tytułu', () => {
  const slug = generateNoteSlug('2026-09-23', 'Aplikacja do grafu myśli');
  if (slug !== '2026-09-23-aplikacja-do-grafu-mysli') {
    throw new Error(`Nieprawidłowy slug: ${slug}`);
  }

  // Z sufiksem kolizyjnym
  const slugWithSuffix = generateNoteSlug('2026-09-23', 'Aplikacja do grafu myśli', '4f1c2a8b');
  if (slugWithSuffix !== '2026-09-23-aplikacja-do-grafu-mysli-4f1c2a') {
    throw new Error(`Nieprawidłowy slug z sufiksem: ${slugWithSuffix}`);
  }
});

Deno.test('renderNoteMarkdown - generuje plik Markdown zgodny z szablonem z §5', () => {
  const md = renderNoteMarkdown({
    id: '4f1c2a99-1234-5678-9abc-def012345678',
    title: 'Aplikacja do grafu myśli',
    noteType: 'idea',
    day: '2026-09-23',
    recordedAt: '2026-09-23T09:14:00+02:00',
    category: 'Praca',
    tags: ['projekt-xyz', 'ux'],
    related: [{ slug: '2026-09-20-nowy-onboarding', title: 'Nowy onboarding' }],
    source: 'watch',
    content: 'Oczyszczona treść notatki o grafie myśli.',
  });

  const expectedLines = [
    '---',
    'type: note',
    'id: 4f1c2a99-1234-5678-9abc-def012345678',
    'note_type: idea',
    'date: 2026-09-23',
    'recorded_at: 2026-09-23T09:14:00+02:00',
    'category: Praca',
    'tags: [projekt-xyz, ux]',
    'daily: "[[2026-09-23]]"',
    'related: ["[[2026-09-20-nowy-onboarding|Nowy onboarding]]"]',
    'source: watch',
    '---',
    '# Aplikacja do grafu myśli',
    '',
    'Oczyszczona treść notatki o grafie myśli.',
  ];

  for (const expectedLine of expectedLines) {
    if (!md.includes(expectedLine)) {
      throw new Error(`Brak oczekiwanej linii w wyrenderowanym Markdownie: "${expectedLine}"\nCałość:\n${md}`);
    }
  }
});
