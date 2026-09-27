/* eslint-disable import/no-unresolved */
import { z } from 'https://deno.land/x/zod@v3.24.2/mod.ts';

export const onboardingGoalsSchema = z.object({
  goals: z.array(z.string().min(1, 'Cel nie może być pusty')).min(1, 'Wymagany jest co najmniej jeden cel'),
});

export type OnboardingGoalsOutput = z.infer<typeof onboardingGoalsSchema>;
