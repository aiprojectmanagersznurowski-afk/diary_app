import {
  DEFAULT_SHARE_SELECTION,
  GOAL_IMPACT_LABELS,
  buildStoryBlocks,
  noteSource,
  notesOfDay,
  orderSelection,
  relationTag,
  sourceText,
  storyBlock,
  toggleSelection,
} from '../detailLogic';
import { DailyDocument } from '../../../../domain/models/DailyDocument';
import { NoteDocument } from '../../../../domain/models/NoteDocument';
import { Recording } from '../../../../domain/models/Recording';

const daily = (extra: Partial<DailyDocument> = {}): DailyDocument =>
  ({
    id: 'd1',
    day: '2026-10-06',
    dominantThought: 'Spokój po biegu',
    summary: 'Dobry dzień.',
    emotionTriggers: [{ emotion: 'Spokój', trigger: 'spacer' }],
    emotions: ['Spokój', 'Radość'],
    completedTasks: ['Bieg', 'Raport'],
    importantEvents: ['Spotkanie z zespołem'],
    impactOnGoals: 'Bieg przybliża do celu zdrowotnego.',
    goalImpactType: 'positive',
    goalAdvice: 'Zadbaj o sen.',
    gratefulFor: 'Za poranek',
    ideas: [{ documentId: 'n1', title: 'Wymiana książek', oneLiner: 'Sąsiedzi' }],
    tags: ['bieg', 'sen'],
    quotes: [],
    ...extra,
  }) as DailyDocument;

describe('zaznaczanie sekcji do udostępnienia', () => {
  it('domyślnie zaznaczona jest tylko „Myśl dnia”', () => {
    expect(DEFAULT_SHARE_SELECTION).toEqual(['hero']);
  });

  it('toggleSelection dodaje i usuwa sekcję bez mutacji', () => {
    const start = ['hero'] as const;
    const withEmotions = toggleSelection([...start], 'emotions');
    expect(withEmotions).toEqual(['hero', 'emotions']);
    expect(toggleSelection(withEmotions, 'hero')).toEqual(['emotions']);
    expect(start).toEqual(['hero']);
  });

  it('orderSelection zachowuje kolejność sekcji z ekranu', () => {
    expect(orderSelection(['keywords', 'hero', 'done'])).toEqual(['hero', 'done', 'keywords']);
  });
});

describe('bloki story (podgląd 9:16)', () => {
  it('buduje bloki w kolejności ekranu z etykietami z prototypu', () => {
    const blocks = buildStoryBlocks(daily(), ['keywords', 'hero', 'advice', 'done'], 'Buddha');
    expect(blocks.map((b) => b.label)).toEqual(['Myśl dnia', 'Zrobione', 'Rada · Buddha', 'Najważniejsze słowa']);
    expect(blocks[0]).toMatchObject({ text: 'Spokój po biegu', big: true });
    expect(blocks[1].text).toBe('Bieg · Raport');
    expect(blocks[3].text).toBe('#bieg  #sen');
  });

  it('emocje: nazwy z emotionTriggers, a bez nich z listy emocji', () => {
    expect(storyBlock(daily(), 'emotions', 'x')?.text).toBe('Spokój');
    expect(storyBlock(daily({ emotionTriggers: [] }), 'emotions', 'x')?.text).toBe('Spokój · Radość');
  });

  it('pomysły: tytuły albo komunikat o braku pomysłów', () => {
    expect(storyBlock(daily(), 'ideas', 'x')?.text).toBe('Wymiana książek');
    expect(storyBlock(daily({ ideas: [] }), 'ideas', 'x')?.text).toBe('Tego dnia bez nowych pomysłów');
  });

  it('pomija sekcje bez danych', () => {
    const empty = daily({
      dominantThought: '',
      completedTasks: [],
      importantEvents: [],
      impactOnGoals: ' ',
      goalAdvice: null,
      gratefulFor: '',
      tags: [],
    });
    expect(buildStoryBlocks(empty, ['hero', 'done', 'events', 'goals', 'advice', 'grateful', 'keywords'], 'x')).toEqual(
      [],
    );
  });
});

describe('etykiety i tagi', () => {
  it('wpływ na cele ma polskie etykiety', () => {
    expect(GOAL_IMPACT_LABELS).toEqual({
      positive: 'Pozytywny wpływ',
      neutral: 'Neutralny wpływ',
      negative: 'Negatywny wpływ',
    });
  });

  it('relationTag mapuje typy relacji na tagi z prototypu', () => {
    expect(relationTag({ relationType: 'semantic' })).toBe('podobny temat');
    expect(relationTag({ relationType: 'day' })).toBe('ten sam dzień');
    expect(relationTag({ relationType: 'wikilink' })).toBe('odnośnik w tekście');
  });
});

describe('notatki dnia i źródło notatki', () => {
  const note = (id: string, day: string, createdAt: string, recordingId?: string) =>
    ({ id, day, createdAt, recordingId }) as NoteDocument;
  const rec = (id: string, source: Recording['source']) => ({ id, source }) as Recording;

  it('notesOfDay filtruje po dniu i sortuje od najwcześniejszej', () => {
    const notes = [
      note('b', '2026-10-06', '2026-10-06T10:00:00Z'),
      note('a', '2026-10-06', '2026-10-06T08:00:00Z'),
      note('x', '2026-10-05', '2026-10-05T08:00:00Z'),
    ];
    expect(notesOfDay(notes, '2026-10-06').map((n) => n.id)).toEqual(['a', 'b']);
    expect(notes.map((n) => n.id)).toEqual(['b', 'a', 'x']);
  });

  it('noteSource i sourceText: iPhone, Apple Watch albo brak informacji', () => {
    const recordings = [rec('r1', 'phone'), rec('r2', 'watch')];
    expect(sourceText(noteSource(note('n', 'd', 't', 'r1'), recordings))).toBe('Nagrane na iPhonie');
    expect(sourceText(noteSource(note('n', 'd', 't', 'r2'), recordings))).toBe('Nagrane na Apple Watch');
    expect(sourceText(noteSource(note('n', 'd', 't', 'brak'), recordings))).toBeNull();
    expect(sourceText(noteSource(note('n', 'd', 't'), recordings))).toBeNull();
  });
});
