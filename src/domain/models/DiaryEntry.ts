export interface ParsedDiaryData {
  dominantThought: string;
  summary: string;
  quotes: string[];
  impactOnGoals: string;
  goalImpactType: 'positive' | 'negative' | 'neutral';
  completedTasks: string[];
  importantEvents: string[];
  emotions: string[];
  emotionTriggers?: { emotion: string; trigger: string; }[];
  fatigueLevel: number; // 1-10
  stressVsCalm: 'stress' | 'calm' | 'neutral';
  gratefulFor: string;
  triggeredStress: string[] | string | null;
  triggeredAnger: string[] | string | null;
  triggeredJoy: string[] | string | null;
  triggeredCalm: string[] | string | null;
  goalAdvice: string | null;
}

export interface DiaryEntry {
  id: string;
  date: Date;
  fullText: string;
  parsedData: ParsedDiaryData | null;
  createdAt: Date;
}

export interface CreateDiaryEntryDTO {
  date: Date;
  fullText: string;
  parsedData: ParsedDiaryData | null;
}
