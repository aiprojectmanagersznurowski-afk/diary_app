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

export const structuredNoteSchema = z.object({
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
  category: z.preprocess((val) => {
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
    return 'Osobiste';
  }, z.string().min(1, 'Kategoria jest wymagana').max(100)),
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
});

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
