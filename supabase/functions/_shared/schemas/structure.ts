/* eslint-disable import/no-unresolved */
import { z } from 'https://deno.land/x/zod@v3.24.2/mod.ts';

export const noteTypeEnum = z.enum(['idea', 'task', 'reflection', 'event']);
export type NoteType = z.infer<typeof noteTypeEnum>;

export const structuredNoteSchema = z.object({
  title: z.string().min(1, 'Tytuł notatki nie może być pusty').max(200, 'Tytuł jest zbyt długi'),
  noteType: noteTypeEnum,
  category: z.string().min(1, 'Kategoria jest wymagana').max(100),
  tags: z.array(z.string().min(1)).default([]),
  content: z.string().min(1, 'Treść notatki nie może być pusta'),
});

export type StructuredNote = z.infer<typeof structuredNoteSchema>;

export const structureSchema = z.object({
  notes: z.array(structuredNoteSchema).min(1, 'Wymagana jest co najmniej jedna notatka'),
});

export type StructureOutput = z.infer<typeof structureSchema>;
