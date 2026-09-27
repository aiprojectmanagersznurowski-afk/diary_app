/* eslint-disable import/no-unresolved */
import { z } from 'https://deno.land/x/zod@v3.24.2/mod.ts';

export const goalImpactTypeEnum = z.enum(['positive', 'negative', 'neutral']);
export type GoalImpactType = z.infer<typeof goalImpactTypeEnum>;

export const stressVsCalmEnum = z.enum(['stress', 'calm', 'neutral']);
export type StressVsCalm = z.infer<typeof stressVsCalmEnum>;

export const emotionTriggerSchema = z.object({
  emotion: z.string().min(1, 'Nazwa emocji jest wymagana'),
  trigger: z.string().min(1, 'Opis wyzwalacza emocji jest wymagany'),
});

export type EmotionTrigger = z.infer<typeof emotionTriggerSchema>;

export const digestIdeaSchema = z.object({
  documentId: z.string().min(1, 'ID dokumentu pomysłu jest wymagane'),
  title: z.string().min(1, 'Tytuł pomysłu jest wymagany'),
  oneLiner: z.string().min(1, 'Jednozdaniowy opis pomysłu jest wymagany'),
});

export type DigestIdea = z.infer<typeof digestIdeaSchema>;

const triggeredFieldSchema = z.union([z.array(z.string()), z.string(), z.null()]).default(null);

export const digestSchema = z.object({
  dominantThought: z.string().min(1, 'Wiodąca myśl jest wymagana'),
  summary: z.string().min(1, 'Podsumowanie jest wymagane'),
  quotes: z.array(z.string()).default([]),
  impactOnGoals: z.string().min(1, 'Wpływ na cele jest wymagany'),
  goalImpactType: goalImpactTypeEnum,
  completedTasks: z.array(z.string()).default([]),
  importantEvents: z.array(z.string()).default([]),
  emotions: z.array(z.string()).default([]),
  emotionTriggers: z.array(emotionTriggerSchema).optional().default([]),
  fatigueLevel: z.number().min(1).max(10),
  stressVsCalm: stressVsCalmEnum,
  gratefulFor: z.string().min(1, 'Wdzięczność jest wymagana'),
  triggeredStress: triggeredFieldSchema,
  triggeredAnger: triggeredFieldSchema,
  triggeredJoy: triggeredFieldSchema,
  triggeredCalm: triggeredFieldSchema,
  goalAdvice: z.string().nullable().default(null),
  ideas: z.array(digestIdeaSchema).default([]),
});

export type DigestOutput = z.infer<typeof digestSchema>;
