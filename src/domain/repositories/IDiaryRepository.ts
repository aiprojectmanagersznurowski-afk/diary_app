import { DiaryEntry, CreateDiaryEntryDTO } from '../models/DiaryEntry';

export interface IDiaryRepository {
  save(entry: CreateDiaryEntryDTO): Promise<DiaryEntry>;
  update(id: string, entry: CreateDiaryEntryDTO): Promise<DiaryEntry>;
  findByDate(date: Date): Promise<DiaryEntry | null>;
  getAll(): Promise<DiaryEntry[]>;
}
