export interface Profile {
  userId: string;
  lifeGoals: string[];
  aiPersonality: string | null;
  theme: string | null;
  timezone: string;
  currentStreak: number;
  lastEntryDay: string | null;
  badges: string[];
  createdAt?: string;
  updatedAt?: string;
}
