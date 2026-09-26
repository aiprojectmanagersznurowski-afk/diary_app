export type RecordingSource = 'phone' | 'watch' | 'web';

export type RecordingQueueStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface QueuedRecording {
  id: string; // UUID
  path: string; // Trwała ścieżka do lokalnego pliku audio
  recordedAt: string; // ISO 8601 timestamp nagrania
  durationMs: number;
  source: RecordingSource;
  status: RecordingQueueStatus;
  attempts: number;
  nextAttemptAt: string | null; // ISO 8601 timestamp następnej próby
  lastError?: string | null;
}

export type NewQueuedRecording = Omit<QueuedRecording, 'status' | 'attempts' | 'nextAttemptAt' | 'lastError'>;
