/* eslint-disable import/no-unresolved */
import { z } from 'https://deno.land/x/zod@v3.24.2/mod.ts';

export const noteTypeEnum = z.enum(['idea', 'task', 'reflection', 'event']);
export type NoteType = z.infer<typeof noteTypeEnum>;

const noteTypeAliases: Record<string, NoteType> = {
  idea: 'idea',
  pomysl: 'idea',
  pomysł: 'idea',
  koncepcja: 'idea',
  task: 'task',
  zadanie: 'task',
  todo: 'task',
  'to-do': 'task',
  reflection: 'reflection',
  refleksja: 'reflection',
  przemyslenie: 'reflection',
  przemyślenie: 'reflection',
  emocja: 'reflection',
  dylemat: 'reflection',
  dylematy: 'reflection',
  event: 'event',
  wydarzenie: 'event',
  spotkanie: 'event',
  fakt: 'event',
};

/** Zamknięta lista kategorii życiowych. „Dylematy” musi mieć dokładnie tę nazwę – zależy od niej Okrągły stół. */
export const CANONICAL_CATEGORIES = [
  'Dylematy',
  'Praca',
  'Zdrowie',
  'Relacje',
  'Finanse',
  'Osobiste',
  'Hobby',
  'Nauka',
] as const;

export const DILEMMA_CATEGORY = 'Dylematy';

const foldText = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l');

const CATEGORY_ALIASES: Record<string, string> = {
  dylemat: 'Dylematy',
  dylematy: 'Dylematy',
  decyzja: 'Dylematy',
  decyzje: 'Dylematy',
  wybor: 'Dylematy',
  wybory: 'Dylematy',
  dilemma: 'Dylematy',
  dilemmas: 'Dylematy',
  decision: 'Dylematy',
  praca: 'Praca',
  kariera: 'Praca',
  zawod: 'Praca',
  work: 'Praca',
  zdrowie: 'Zdrowie',
  sport: 'Zdrowie',
  health: 'Zdrowie',
  relacje: 'Relacje',
  rodzina: 'Relacje',
  zwiazek: 'Relacje',
  przyjaciele: 'Relacje',
  finanse: 'Finanse',
  pieniadze: 'Finanse',
  osobiste: 'Osobiste',
  osobisty: 'Osobiste',
  zycie: 'Osobiste',
  hobby: 'Hobby',
  pasje: 'Hobby',
  nauka: 'Nauka',
  edukacja: 'Nauka',
  rozwoj: 'Nauka',
};

/** Sprowadza kategorię z LLM do jednej z kanonicznych nazw (wielkość liter, diakrytyki, synonimy). */
export function normalizeCategory(val: unknown): string {
  if (typeof val !== 'string' || val.trim().length === 0) return 'Osobiste';
  const folded = foldText(val);
  if (CATEGORY_ALIASES[folded]) return CATEGORY_ALIASES[folded];
  if (
    folded.includes('dylemat') ||
    folded.startsWith('decyzj') ||
    folded.startsWith('wybor') ||
    folded.includes('dilemma')
  ) {
    return DILEMMA_CATEGORY;
  }
  const canonical = CANONICAL_CATEGORIES.find((c) => foldText(c) === folded);
  if (canonical) return canonical;
  const trimmed = val.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export const structuredNoteSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === 'object') {
      const obj = { ...(raw as Record<string, unknown>) };
      if (!obj.content && (obj.body || obj.text || obj.note)) {
        obj.content = obj.body ?? obj.text ?? obj.note;
      }
      return obj;
    }
    return raw;
  },
  z.object({
    title: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : String(val ?? '')),
      z.string().min(1, 'Tytuł notatki nie może być pusty').max(200, 'Tytuł jest zbyt długi'),
    ),
    noteType: z.preprocess((val) => {
      if (typeof val === 'string') {
        const normalized = val.trim().toLowerCase();
        return noteTypeAliases[normalized] ?? normalized;
      }
      return val;
    }, noteTypeEnum),
    category: z.preprocess((val) => normalizeCategory(val), z.string().min(1, 'Kategoria jest wymagana').max(100)),
    tags: z.preprocess(
      (val) => {
        if (Array.isArray(val)) {
          return val.map((item) => String(item).trim()).filter((item) => item.length > 0);
        }
        if (typeof val === 'string') {
          return val
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
        }
        return [];
      },
      z.array(z.string().min(1)).default([]),
    ),
    content: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : String(val ?? '')),
      z.string().min(1, 'Treść notatki nie może być pusta'),
    ),
  }),
);

export type StructuredNote = z.infer<typeof structuredNoteSchema>;

export const structureSchema = z.preprocess(
  (val) => {
    if (Array.isArray(val)) {
      return { notes: val };
    }
    if (val && typeof val === 'object' && !('notes' in val)) {
      const obj = val as Record<string, unknown>;
      const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      if (arrayKey) {
        return { ...obj, notes: obj[arrayKey] };
      }
    }
    return val;
  },
  z.object({
    notes: z.array(structuredNoteSchema).min(1, 'Wymagana jest co najmniej jedna notatka'),
  }),
);

export type StructureOutput = z.infer<typeof structureSchema>;
