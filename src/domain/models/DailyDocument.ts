export interface DailyIdea {
  documentId: string;
  title: string;
  oneLiner: string;
}

export interface DailyEmotionTrigger {
  emotion: string;
  trigger: string;
}

export interface DailyDocument {
  id: string;
  userId: string;
  kind: 'daily';
  day: string; // YYYY-MM-DD
  bodyMd: string;
  mdPath: string;
  tags: string[];
  dominantThought: string;
  summary: string;
  quotes: string[];
  impactOnGoals: string;
  goalImpactType: 'positive' | 'negative' | 'neutral';
  completedTasks: string[];
  importantEvents: string[];
  emotions: string[];
  emotionTriggers: DailyEmotionTrigger[];
  fatigueLevel: number;
  stressVsCalm: 'stress' | 'calm' | 'neutral';
  gratefulFor: string;
  goalAdvice: string | null;
  ideas: DailyIdea[];
  createdAt: string;
}
