import { IRecordingQueue } from '../../../domain/services/IRecordingQueue';
import { IRecordingUploader } from '../../../domain/services/IRecordingUploader';
import { IFileStorage } from '../../../domain/services/IFileStorage';
import { QueuedRecording } from '../../../domain/models/QueuedRecording';
import { BackoffConfig, DEFAULT_BACKOFF_CONFIG, calculateNextAttempt } from './backoff';

export interface ProcessQueueResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: { id: string; error: string }[];
}

export class ProcessRecordingQueueUseCase {
  private isProcessing = false;

  constructor(
    private recordingQueue: IRecordingQueue,
    private uploader: IRecordingUploader,
    private fileStorage: IFileStorage,
    private backoffConfig: BackoffConfig = DEFAULT_BACKOFF_CONFIG,
  ) {}

  /**
   * Przetwarza wszystkie oczekujące nagrania (status = 'pending' i nextAttemptAt <= now).
   * Zabezpieczone przed równoległym wywołaniem.
   */
  async processPending(): Promise<ProcessQueueResult> {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0, errors: [] };
    }

    this.isProcessing = true;
    const result: ProcessQueueResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    try {
      const pendingRecordings = await this.recordingQueue.getPending();

      for (const recording of pendingRecordings) {
        result.processed++;
        const success = await this.processSingleRecording(recording);
        if (success) {
          result.succeeded++;
        } else {
          result.failed++;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return result;
  }

  /**
   * Przetwarza pojedyncze nagranie z obsługą błędów, wykładniczym odstępem i bezpiecznym usuwaniem pliku.
   */
  async processSingleRecording(recording: QueuedRecording): Promise<boolean> {
    // 1. Oznacz jako w trakcie wysyłki
    await this.recordingQueue.markUploading(recording.id);

    try {
      // 2. Próba wysłania (upload do Storage + INSERT recordings w Supabase)
      await this.uploader.upload(recording);

      // 3. Sukces: usuwamy plik lokalny DOPIERO po potwierdzeniu zapisu na serwerze
      await this.fileStorage.deleteFile(recording.path);

      // 4. Usuwamy wiersz z lokalnej kolejki
      await this.recordingQueue.remove(recording.id);

      return true;
    } catch (error) {
      // Błąd: plik audio NIE jest usuwany z dysku!
      const newAttempts = recording.attempts + 1;
      const { nextAttemptAt } = calculateNextAttempt(newAttempts, new Date(), this.backoffConfig);

      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.recordingQueue.markFailed(recording.id, errorMessage, nextAttemptAt, newAttempts);

      return false;
    }
  }

  /**
   * Ręczne ponowienie wysyłki nagrania (np. po kliknięciu „Spróbuj ponownie”).
   */
  async retry(id: string): Promise<boolean> {
    const recording = await this.recordingQueue.getById(id);
    if (!recording) {
      return false;
    }

    // Resetujemy czas kolejnej próby na bieżący moment
    await this.recordingQueue.markFailed(id, '', new Date().toISOString(), recording.attempts);
    return this.processSingleRecording(recording);
  }
}
