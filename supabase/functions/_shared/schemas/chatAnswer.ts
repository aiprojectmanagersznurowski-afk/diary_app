/* eslint-disable import/no-unresolved */
import { z } from 'https://deno.land/x/zod@v3.24.2/mod.ts';

export const chatCitationSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  day: z.string(),
  kind: z.string(),
  noteType: z.string().nullable().optional(),
  snippet: z.string(),
});

export const chatAnswerSchema = z.object({
  content: z.string(),
  citations: z.array(chatCitationSchema).default([]),
});

export type ChatCitation = z.infer<typeof chatCitationSchema>;
export type ChatAnswer = z.infer<typeof chatAnswerSchema>;
