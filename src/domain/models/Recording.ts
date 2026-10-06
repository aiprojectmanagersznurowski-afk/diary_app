import { RecordingSource } from './QueuedRecording';

export type RecordingStatus = 'queued' | 'uploaded' | 'transcribed' | 'segmented' | 'done' | 'failed';

export type RecordingUiStatus = 'queued' | 'uploaded' | 'processing' | 'done' | 'failed';

export interface Recording {
  id: string;
  userId: string;
  source: RecordingSource;
  recordedAt: string;
  durationMs?: number | null;
  audioPath?: string | null;
  rawTranscript?: string | null;
  status: RecordingStatus;
  attempts: number;
  lastError?: string | null;
  createdAt?: string;
}

export function mapRecordingStatusToUi(status: RecordingStatus): RecordingUiStatus {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'uploaded':
      return 'uploaded';
    case 'transcribed':
    case 'segmented':
      return 'processing';
    case 'done':
      return 'done';
    case 'failed':
      return 'failed';
    default:
      return 'processing';
  }
}

export function getRecordingStatusLabel(status: RecordingStatus): string {
  switch (status) {
    case 'queued':
      return 'W kolejce';
    case 'uploaded':
      return 'Wysłane';
    case 'transcribed':
      return 'Transkrypcja...';
    case 'segmented':
      return 'Podział na notatki...';
    case 'done':
      return 'Gotowe';
    case 'failed':
      return 'Błąd';
    default:
      return 'Przetwarzanie';
  }
}

export function getRecordingStatusBadgeColor(status: RecordingStatus): string {
  switch (status) {
    case 'queued':
      return '#9CA3AF'; // szary
    case 'uploaded':
      return '#60A5FA'; // błękitny
    case 'transcribed':
    case 'segmented':
      return '#A78BFA'; // fioletowy
    case 'done':
      return '#34D399'; // zielony
    case 'failed':
      return '#F87171'; // czerwony
    default:
      return '#9CA3AF';
  }
}

export function isRecordingRetryable(status: RecordingStatus): boolean {
  return status === 'failed';
}

/** Nagranie jest w toku, dopóki nie jest gotowe ani nie zakończyło się błędem. */
export function isRecordingInProgress(status: RecordingStatus): boolean {
  return status !== 'done' && status !== 'failed';
}

/** Postęp przetwarzania w procentach (pasek pod wierszem: 20/40/60/80/100). */
export function getRecordingProgress(status: RecordingStatus): number {
  switch (status) {
    case 'queued':
      return 20;
    case 'uploaded':
      return 40;
    case 'transcribed':
      return 60;
    case 'segmented':
      return 80;
    case 'done':
      return 100;
    default:
      return 0;
  }
}
