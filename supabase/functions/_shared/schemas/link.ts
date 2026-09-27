/* eslint-disable import/no-unresolved */
import { z } from 'https://deno.land/x/zod@v3.24.2/mod.ts';

export const linkItemSchema = z.object({
  targetId: z.string().min(1, 'Identyfikator powiązanego dokumentu jest wymagany'),
  score: z.number().min(0).max(1, 'Ocena powiązania musi mieścić się w przedziale [0, 1]'),
  reason: z.string().min(1, 'Powód powiązania jest wymagany').max(500, 'Powód powiązania jest zbyt długi'),
});

export type LinkItem = z.infer<typeof linkItemSchema>;

export const linkSchema = z.object({
  links: z.array(linkItemSchema).default([]),
});

export type LinkOutput = z.infer<typeof linkSchema>;
