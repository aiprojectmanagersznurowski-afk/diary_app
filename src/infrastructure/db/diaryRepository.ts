import { IDiaryRepository } from '../../domain/repositories/IDiaryRepository';
import { DiaryEntry, CreateDiaryEntryDTO } from '../../domain/models/DiaryEntry';

export class InMemoryDiaryRepository implements IDiaryRepository {
  private entries: Map<string, DiaryEntry> = new Map();

  async save(entry: CreateDiaryEntryDTO): Promise<DiaryEntry> {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `entry-${Date.now()}`;
    const now = new Date();

    const newEntry: DiaryEntry = {
      id,
      date: entry.date,
      fullText: entry.fullText,
      parsedData: entry.parsedData,
      createdAt: now,
    };

    this.entries.set(id, newEntry);
    return newEntry;
  }

  async update(id: string, entry: CreateDiaryEntryDTO): Promise<DiaryEntry> {
    const existing = this.entries.get(id);
    if (!existing) {
      throw new Error(`Entry ${id} not found`);
    }

    const updated: DiaryEntry = {
      ...existing,
      fullText: entry.fullText,
      parsedData: entry.parsedData,
    };

    this.entries.set(id, updated);
    return updated;
  }

  async findByDate(targetDate: Date): Promise<DiaryEntry | null> {
    const targetDay = new Date(targetDate);
    targetDay.setHours(0, 0, 0, 0);

    for (const entry of this.entries.values()) {
      const entryDay = new Date(entry.date);
      entryDay.setHours(0, 0, 0, 0);
      if (entryDay.getTime() === targetDay.getTime()) {
        return entry;
      }
    }

    return null;
  }

  async getAll(): Promise<DiaryEntry[]> {
    return Array.from(this.entries.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

// Alias dla wstecznej kompatybilności do czasu migracji F2
export const FirestoreDiaryRepository = InMemoryDiaryRepository;
