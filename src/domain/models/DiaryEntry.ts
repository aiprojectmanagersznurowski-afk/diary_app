export interface ParsedDiaryData {
  quote: string;
  emotions: string[];
  tone: string;
  fatigue_level: "Świeży umysł" | "Energiczny" | "Zmęczony" | "Bardzo zmęczony";
  tasks_done: string[];
  gratitude: string[];
  anger_triggers: string[];
  important_quotes?: string[];
  goal_alignment: {
    status: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    reason: string;
  };
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
