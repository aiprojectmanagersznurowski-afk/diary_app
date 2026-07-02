export interface ParsedDiaryData {
  dominantThought: string;
  summary: string;
  quotes: string[];
  impactOnGoals: string;
  goalImpactType: 'positive' | 'negative' | 'neutral';
  completedTasks: string[];
  emotions: string[];
  fatigueLevel: number; // 1-10
  stressVsCalm: 'stress' | 'calm' | 'neutral';
  gratefulFor: string;
  triggeredStress: string | null;
  triggeredAnger: string | null;
  triggeredJoy: string | null;
  triggeredCalm: string | null;
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
