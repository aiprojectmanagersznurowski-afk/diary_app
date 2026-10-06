/**
 * Stałe kolory niezależne od motywu (docs/08-design-ui.md §1.1–§1.3): akcenty, emocje, typy
 * notatek, statusy nagrań, wpływ na cele. Komponenty czytają kolory motywu z `THEMES`
 * (useSettingsStore), a te wartości — wyłącznie stąd.
 */

export const ACCENTS = {
  pink: '#F472B6',
  blue: '#60A5FA',
  sky: '#38BDF8',
  indigo: '#818CF8',
  purple: '#A855F7',
  amber: '#FBBF24',
  lilac: '#F0ABFC',
  error: '#F87171',
  errorStrong: '#EF4444',
  errorDeep: '#B91C1C',
  success: '#34D399',
  neutral: '#9CA3AF',
} as const;

/** Gradient przycisku nagrywania i wersja „nagrywanie trwa”. */
export const RECORD_GRADIENT = ['#A78BFA', '#F472B6', '#60A5FA'] as const;
export const RECORD_LIVE_GRADIENT = ['#EF4444', '#B91C1C'] as const;

/** Biały przycisk logowania (Google) i tekst na nim — taki sam we wszystkich motywach. */
export const WHITE_BUTTON = { background: '#FFFFFF', text: '#111114', border: 'rgba(0,0,0,0.08)' } as const;

/** Tekst na pigułkach emocji i chipach statusu (ciemny, bo tła są pastelowe). */
export const PILL_TEXT = '#1A1625';
export const STATUS_TEXT = '#0B0B12';

export type Emotion = {
  label: string;
  color: string;
  from: string;
  to: string;
};

export const EMOTIONS: Record<string, Emotion> = {
  joy: { label: 'Radość', color: '#FDBA74', from: '#FBBF24', to: '#F472B6' },
  calm: { label: 'Spokój', color: '#7DD3FC', from: '#38BDF8', to: '#818CF8' },
  stress: { label: 'Stres', color: '#FCA5A5', from: '#FB7185', to: '#F87171' },
  gratitude: { label: 'Wdzięczność', color: '#C4B5FD', from: '#A78BFA', to: '#F0ABFC' },
  focus: { label: 'Skupienie', color: '#93C5FD', from: '#60A5FA', to: '#22D3EE' },
  fatigue: { label: 'Zmęczenie', color: '#A5B4FC', from: '#818CF8', to: '#6366F1' },
  hope: { label: 'Nadzieja', color: '#F0ABFC', from: '#E879F9', to: '#818CF8' },
};

/** Dopasowuje tekst emocji (może zawierać emoji i polskie znaki) do kategorii; domyślnie „Radość”. */
export function resolveEmotion(raw: string): Emotion {
  const normalized = (raw || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase();
  const polish: Record<string, string> = {
    radosc: 'joy',
    spokoj: 'calm',
    stres: 'stress',
    wdziecznosc: 'gratitude',
    skupienie: 'focus',
    zmeczenie: 'fatigue',
    nadzieja: 'hope',
  };
  const key =
    Object.keys(EMOTIONS).find((k) => normalized.includes(k)) ??
    Object.keys(polish).find((k) => normalized.includes(k));
  const resolved = key && polish[key] ? polish[key] : key;
  return EMOTIONS[resolved ?? 'joy'] ?? EMOTIONS.joy;
}

export type NoteTypeKey = 'idea' | 'task' | 'reflection' | 'event';

export const NOTE_TYPE_STYLE: Record<
  NoteTypeKey,
  { label: string; color: string; icon: 'zap' | 'check-square' | 'feather' | 'calendar' }
> = {
  idea: { label: 'Pomysł', color: '#FBBF24', icon: 'zap' },
  task: { label: 'Zadanie', color: '#60A5FA', icon: 'check-square' },
  reflection: { label: 'Refleksja', color: '#F0ABFC', icon: 'feather' },
  event: { label: 'Wydarzenie', color: '#38BDF8', icon: 'calendar' },
};

export type RecordingStage = 'queued' | 'uploaded' | 'processing' | 'done' | 'failed';

export const STATUS_STYLE: Record<RecordingStage, { color: string; pulse: boolean }> = {
  queued: { color: '#9CA3AF', pulse: false },
  uploaded: { color: '#60A5FA', pulse: true },
  processing: { color: '#A78BFA', pulse: true },
  done: { color: '#34D399', pulse: false },
  failed: { color: '#F87171', pulse: false },
};

export const GOAL_IMPACT_COLORS = {
  positive: '#34D399',
  neutral: '#D1D5DB',
  negative: '#F87171',
} as const;

/** Kolory pomocnicze używane w komponentach (cienie, ikony na gradiencie, poświata przycisku nagrywania). */
export const WHITE = '#FFFFFF';
export const SHADOW = '#000000';
export const RECORD_GLOW = 'rgba(244,114,182,0.45)';
export const RECORD_LIVE_GLOW = 'rgba(239,68,68,0.5)';
export const RECORD_RING = 'rgba(239,68,68,0.65)';
export const ERROR_SURFACE = 'rgba(239,68,68,0.15)';
export const ERROR_BORDER = 'rgba(239,68,68,0.4)';
