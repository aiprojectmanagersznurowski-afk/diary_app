import * as SQLite from 'expo-sqlite';
import { IRecordingQueue } from '../../domain/services/IRecordingQueue';
import {
  QueuedRecording,
  NewQueuedRecording,
  RecordingSource,
  RecordingQueueStatus,
} from '../../domain/models/QueuedRecording';

interface QueuedRecordingRow {
  id: string;
  path: string;
  recorded_at: string;
  duration_ms: number;
  source: string;
  status: string;
  attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
}

function mapRowToRecording(row: QueuedRecordingRow): QueuedRecording {
  return {
    id: row.id,
    path: row.path,
    recordedAt: row.recorded_at,
    durationMs: row.duration_ms,
    source: row.source as RecordingSource,
    status: row.status as RecordingQueueStatus,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
  };
}

export class SqliteRecordingQueue implements IRecordingQueue {
  private dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
  private initialized = false;

  constructor(
    private dbName: string = 'recordings_queue.db',
    existingDb?: SQLite.SQLiteDatabase,
  ) {
    if (existingDb) {
      this.dbPromise = Promise.resolve(existingDb);
    }
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = SQLite.openDatabaseAsync(this.dbName);
    }
    const db = await this.dbPromise;
    if (!this.initialized) {
      await this.initSchema(db);
      this.initialized = true;
    }
    return db;
  }

  private async initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS queued_recordings (
        id TEXT PRIMARY KEY NOT NULL,
        path TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TEXT,
        last_error TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_queued_recordings_status_next
      ON queued_recordings (status, next_attempt_at);
    `);
  }

  async enqueue(recording: NewQueuedRecording): Promise<QueuedRecording> {
    const db = await this.getDb();
    const nowIso = new Date().toISOString();

    const newRecord: QueuedRecording = {
      ...recording,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: nowIso,
      lastError: null,
    };

    await db.runAsync(
      `INSERT INTO queued_recordings (id, path, recorded_at, duration_ms, source, status, attempts, next_attempt_at, last_error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newRecord.id,
      newRecord.path,
      newRecord.recordedAt,
      newRecord.durationMs,
      newRecord.source,
      newRecord.status,
      newRecord.attempts,
      newRecord.nextAttemptAt,
      newRecord.lastError ?? null,
    );

    return newRecord;
  }

  async getPending(now: Date = new Date()): Promise<QueuedRecording[]> {
    const db = await this.getDb();
    const nowIso = now.toISOString();

    const rows = await db.getAllAsync<QueuedRecordingRow>(
      `SELECT * FROM queued_recordings
       WHERE status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
       ORDER BY recorded_at ASC`,
      nowIso,
    );

    return rows.map(mapRowToRecording);
  }

  async getById(id: string): Promise<QueuedRecording | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<QueuedRecordingRow>(`SELECT * FROM queued_recordings WHERE id = ?`, id);
    return row ? mapRowToRecording(row) : null;
  }

  async getAll(): Promise<QueuedRecording[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<QueuedRecordingRow>(`SELECT * FROM queued_recordings ORDER BY recorded_at DESC`);
    return rows.map(mapRowToRecording);
  }

  async markUploading(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`UPDATE queued_recordings SET status = 'uploading' WHERE id = ?`, id);
  }

  async markSuccess(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`UPDATE queued_recordings SET status = 'uploaded', next_attempt_at = NULL WHERE id = ?`, id);
  }

  async markFailed(id: string, error: string, nextAttemptAt: string | null, attempts: number): Promise<void> {
    const db = await this.getDb();
    const newStatus: RecordingQueueStatus = nextAttemptAt === null ? 'failed' : 'pending';

    await db.runAsync(
      `UPDATE queued_recordings
       SET status = ?, attempts = ?, next_attempt_at = ?, last_error = ?
       WHERE id = ?`,
      newStatus,
      attempts,
      nextAttemptAt,
      error,
      id,
    );
  }

  async remove(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`DELETE FROM queued_recordings WHERE id = ?`, id);
  }
}
