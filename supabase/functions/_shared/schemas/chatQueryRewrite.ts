/* eslint-disable import/no-unresolved */
import { z } from 'https://deno.land/x/zod@v3.24.2/mod.ts';

export const chatQueryRewriteSchema = z.object({
  search_query: z.string().default(''),
  date_from: z
    .string()
    .nullish()
    .transform((val) => (val && /^\d{4}-\d{2}-\d{2}$/.test(val.trim()) ? val.trim() : null)),
  date_to: z
    .string()
    .nullish()
    .transform((val) => (val && /^\d{4}-\d{2}-\d{2}$/.test(val.trim()) ? val.trim() : null)),
  kinds: z
    .array(z.string())
    .nullish()
    .transform((val) => (val && val.length > 0 ? val : null)),
  categories: z
    .array(z.string())
    .nullish()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type ChatQueryRewrite = z.infer<typeof chatQueryRewriteSchema>;
