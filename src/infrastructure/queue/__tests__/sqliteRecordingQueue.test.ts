import { SqliteRecordingQueue } from '../sqliteRecordingQueue';
import * as SQLite from 'expo-sqlite';

// Mock bazy SQLite na potrzeby testów jednostkowych
class MockSQLiteDatabase {
  public executedQueries: string[] = [];
  public storedRows: Map<string, any> = new Map();

  async execAsync(source: string): Promise<void> {
    this.executedQueries.push(source);
  }

  async runAsync(source: string, ...params: any[]): Promise<any> {
    this.executedQueries.push(source);

    if (source.includes('INSERT INTO queued_recordings')) {
      const [id, path, recorded_at, duration_ms, sourceCol, status, attempts, next_attempt_at, last_error] = params;
      this.storedRows.set(id, {
        id,
        path,
        recorded_at,
        duration_ms,
        source: sourceCol,
        status,
        attempts,
        next_attempt_at,
        last_error,
      });
    } else if (source.includes('UPDATE queued_recordings') && source.includes('status = ?')) {
      const [status, attempts, next_attempt_at, last_error, id] = params;
      const row = this.storedRows.get(id);
      if (row) {
        row.status = status;
        row.attempts = attempts;
        row.next_attempt_at = next_attempt_at;
        row.last_error = last_error;
      }
    } else if (source.includes("SET status = 'uploading'")) {
      const [id] = params;
      const row = this.storedRows.get(id);
      if (row) {
        row.status = 'uploading';
      }
    } else if (source.includes("SET status = 'uploaded'")) {
      const [id] = params;
      const row = this.storedRows.get(id);
      if (row) {
        row.status = 'uploaded';
        row.next_attempt_at = null;
      }
    } else if (source.includes('DELETE FROM queued_recordings')) {
      const [id] = params;
      this.storedRows.delete(id);
    }

    return { changes: 1, lastInsertRowId: 1 };
  }

  async getAllAsync<T>(_source: string, ..._params: any[]): Promise<T[]> {
    return Array.from(this.storedRows.values()) as T[];
  }

  async getFirstAsync<T>(_source: string, ...params: any[]): Promise<T | null> {
    const id = params[0];
    return (this.storedRows.get(id) as T) || null;
  }
}

describe('SqliteRecordingQueue', () => {
  let mockDb: MockSQLiteDatabase;

  beforeEach(() => {
    mockDb = new MockSQLiteDatabase();
  });

  it('inicjalizuje schemat tabeli queued_recordings', async () => {
    const queue = new SqliteRecordingQueue('test.db', mockDb as unknown as SQLite.SQLiteDatabase);

    await queue.getAll();
    expect(mockDb.executedQueries.some((q) => q.includes('CREATE TABLE IF NOT EXISTS queued_recordings'))).toBe(true);
  });

  it('dodaje nagranie do tabeli SQLite z prawidłowymi kolumnami', async () => {
    const queue = new SqliteRecordingQueue('test.db', mockDb as unknown as SQLite.SQLiteDatabase);

    const recording = await queue.enqueue({
      id: 'uuid-rec-1',
      path: 'file:///path/rec-1.m4a',
      recordedAt: '2026-09-26T10:00:00.000Z',
      durationMs: 4500,
      source: 'phone',
    });

    expect(recording.id).toBe('uuid-rec-1');
    expect(recording.status).toBe('pending');
    expect(recording.attempts).toBe(0);

    const fromDb = await queue.getById('uuid-rec-1');
    expect(fromDb).not.toBeNull();
    expect(fromDb?.id).toBe('uuid-rec-1');
    expect(fromDb?.path).toBe('file:///path/rec-1.m4a');
    expect(fromDb?.durationMs).toBe(4500);
  });

  it('Kryterium: restart aplikacji nie gubi nagrań z kolejki (trwałość w SQLite)', async () => {
    // 1. Sesja aplikacji A: dodanie nagrania do bazy
    const queueSession1 = new SqliteRecordingQueue('test.db', mockDb as unknown as SQLite.SQLiteDatabase);
    await queueSession1.enqueue({
      id: 'persistent-uuid-999',
      path: 'file:///permanent/999.m4a',
      recordedAt: '2026-09-26T10:05:00.000Z',
      durationMs: 9000,
      source: 'watch',
    });

    // 2. Symulacja restartu aplikacji: tworzymy nową instancję SqliteRecordingQueue podłączoną do tego samego pliku bazy SQLite
    const queueSession2 = new SqliteRecordingQueue('test.db', mockDb as unknown as SQLite.SQLiteDatabase);

    const restoredRecording = await queueSession2.getById('persistent-uuid-999');
    expect(restoredRecording).not.toBeNull();
    expect(restoredRecording?.id).toBe('persistent-uuid-999');
    expect(restoredRecording?.status).toBe('pending');
    expect(restoredRecording?.durationMs).toBe(9000);
    expect(restoredRecording?.source).toBe('watch');

    const pendingList = await queueSession2.getPending();
    expect(pendingList.some((r) => r.id === 'persistent-uuid-999')).toBe(true);
  });

  it('poprawnie aktualizuje status i usuwa rekord z SQLite', async () => {
    const queue = new SqliteRecordingQueue('test.db', mockDb as unknown as SQLite.SQLiteDatabase);

    await queue.enqueue({
      id: 'uuid-delete-test',
      path: 'file:///path/delete.m4a',
      recordedAt: '2026-09-26T10:00:00.000Z',
      durationMs: 2000,
      source: 'phone',
    });

    await queue.markUploading('uuid-delete-test');
    let item = await queue.getById('uuid-delete-test');
    expect(item?.status).toBe('uploading');

    await queue.markFailed('uuid-delete-test', 'Error 500', '2026-09-26T10:05:00.000Z', 1);
    item = await queue.getById('uuid-delete-test');
    expect(item?.status).toBe('pending');
    expect(item?.attempts).toBe(1);
    expect(item?.lastError).toBe('Error 500');

    await queue.remove('uuid-delete-test');
    item = await queue.getById('uuid-delete-test');
    expect(item).toBeNull();
  });
});
