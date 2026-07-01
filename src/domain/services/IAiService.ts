import { ParsedDiaryData } from '../models/DiaryEntry';

export interface LlmAnalysisResult {
  full_text: string;
  parsedData: ParsedDiaryData;
}

export interface IAiService {
  transcribe(audioUri: string): Promise<string>;
  extractData(transcript: string, lifeGoals: string[]): Promise<LlmAnalysisResult>;
  extractLifeGoalsFromTranscript(transcript: string): Promise<string[]>;
}
