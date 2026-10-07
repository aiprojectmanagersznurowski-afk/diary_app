import { DailyDocument } from '../../../domain/models/DailyDocument';
import { NoteDocument } from '../../../domain/models/NoteDocument';
import { RelatedThought, RelationType } from '../../../domain/models/RelatedThought';
import { Recording } from '../../../domain/models/Recording';

/** Sekcje wpisu dnia, które można zaznaczyć do udostępnienia (kolejność jak w prototypie, docs/08-design-ui.md §2.6). */
export const SHARE_SECTION_KEYS = [
  'hero',
  'emotions',
  'done',
  'events',
  'goals',
  'advice',
  'grateful',
  'ideas',
  'keywords',
] as const;

export type ShareSectionKey = (typeof SHARE_SECTION_KEYS)[number];

/** Domyślnie zaznaczona jest „Myśl dnia”. */
export const DEFAULT_SHARE_SELECTION: ShareSectionKey[] = ['hero'];

export function toggleSelection(selection: ShareSectionKey[], key: ShareSectionKey): ShareSectionKey[] {
  return selection.includes(key) ? selection.filter((k) => k !== key) : [...selection, key];
}

/** Zachowuje kolejność sekcji z ekranu niezależnie od kolejności zaznaczania. */
export function orderSelection(selection: ShareSectionKey[]): ShareSectionKey[] {
  return SHARE_SECTION_KEYS.filter((k) => selection.includes(k));
}

export interface StoryBlock {
  key: ShareSectionKey;
  label: string;
  text: string;
  big: boolean;
}

const hasText = (value: string | null | undefined): value is string => !!value && value.trim().length > 0;

/** Lista elementów „Zrobione”, „Ważne wydarzenia” itd. łączona kropką środkową (jak w prototypie). */
const joinDot = (items: string[]) => items.join(' · ');

export const STORY_LABELS = {
  hero: 'Myśl dnia',
  emotions: 'Emocje',
  done: 'Zrobione',
  events: 'Ważne wydarzenia',
  goals: 'Wpływ na cele',
  advice: (voice: string) => `Rada · ${voice}`,
  grateful: 'Za to jestem wdzięczny',
  ideas: 'Pomysły',
  keywords: 'Najważniejsze słowa',
} as const;

export const STORY_NO_IDEAS = 'Tego dnia bez nowych pomysłów';

/** Treść pojedynczej sekcji do podglądu story; `null`, gdy wpis nie ma danych dla tej sekcji. */
export function storyBlock(daily: DailyDocument, key: ShareSectionKey, voice: string): StoryBlock | null {
  switch (key) {
    case 'hero':
      return hasText(daily.dominantThought)
        ? { key, label: STORY_LABELS.hero, text: daily.dominantThought, big: true }
        : null;
    case 'emotions': {
      const names = daily.emotionTriggers.length > 0 ? daily.emotionTriggers.map((e) => e.emotion) : daily.emotions;
      return names.length > 0 ? { key, label: STORY_LABELS.emotions, text: joinDot(names), big: false } : null;
    }
    case 'done':
      return daily.completedTasks.length > 0
        ? { key, label: STORY_LABELS.done, text: joinDot(daily.completedTasks), big: false }
        : null;
    case 'events':
      return daily.importantEvents.length > 0
        ? { key, label: STORY_LABELS.events, text: joinDot(daily.importantEvents), big: false }
        : null;
    case 'goals':
      return hasText(daily.impactOnGoals)
        ? { key, label: STORY_LABELS.goals, text: daily.impactOnGoals, big: false }
        : null;
    case 'advice':
      return hasText(daily.goalAdvice)
        ? { key, label: STORY_LABELS.advice(voice), text: daily.goalAdvice, big: false }
        : null;
    case 'grateful':
      return hasText(daily.gratefulFor)
        ? { key, label: STORY_LABELS.grateful, text: daily.gratefulFor, big: false }
        : null;
    case 'ideas':
      return {
        key,
        label: STORY_LABELS.ideas,
        text: daily.ideas.length > 0 ? joinDot(daily.ideas.map((i) => i.title)) : STORY_NO_IDEAS,
        big: false,
      };
    case 'keywords':
      return daily.tags.length > 0
        ? { key, label: STORY_LABELS.keywords, text: `#${daily.tags.join('  #')}`, big: false }
        : null;
    default:
      return null;
  }
}

/** Bloki story dla zaznaczonych sekcji, w kolejności z ekranu; sekcje bez danych są pomijane. */
export function buildStoryBlocks(daily: DailyDocument, selection: ShareSectionKey[], voice: string): StoryBlock[] {
  return orderSelection(selection)
    .map((key) => storyBlock(daily, key, voice))
    .filter((block): block is StoryBlock => block !== null);
}

export type GoalImpactKey = DailyDocument['goalImpactType'];

export const GOAL_IMPACT_LABELS: Record<GoalImpactKey, string> = {
  positive: 'Pozytywny wpływ',
  neutral: 'Neutralny wpływ',
  negative: 'Negatywny wpływ',
};

/** Tag relacji na karcie powiązanej myśli (prototyp: „podobny temat”, „ten sam dzień”…). */
export const RELATION_TAGS: Record<RelationType, string> = {
  semantic: 'podobny temat',
  day: 'ten sam dzień',
  wikilink: 'odnośnik w tekście',
  llm: 'powiązanie AI',
  manual: 'powiązanie ręczne',
};

export function relationTag(thought: Pick<RelatedThought, 'relationType'>): string {
  return RELATION_TAGS[thought.relationType] ?? 'powiązanie';
}

/** Notatki z danego dnia, od najwcześniejszej (kolejność z dnia). */
export function notesOfDay(notes: NoteDocument[], day: string): NoteDocument[] {
  return notes.filter((n) => n.day === day).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function sourceText(source: Recording['source'] | undefined): string | null {
  if (source === 'watch') return 'Nagrane na Apple Watch';
  if (source === 'phone') return 'Nagrane na iPhonie';
  return null;
}

/** Źródło notatki (iPhone/zegarek) z nagrania, z którego powstała; `undefined`, gdy nagrania nie ma w pamięci. */
export function noteSource(
  note: Pick<NoteDocument, 'recordingId'>,
  recordings: Recording[],
): Recording['source'] | undefined {
  if (!note.recordingId) return undefined;
  return recordings.find((r) => r.id === note.recordingId)?.source;
}
