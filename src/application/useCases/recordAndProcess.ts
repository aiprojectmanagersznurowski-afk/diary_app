import { IAudioRecorder } from '../../domain/services/IAudioRecorder';
import { QueuedRecording } from '../../domain/models/QueuedRecording';
import { EnqueueRecordingUseCase } from './recording/enqueueRecordingUseCase';
import { ProcessRecordingQueueUseCase } from './recording/processRecordingQueueUseCase';

/**
 * Nagranie z telefonu: zapis do lokalnej kolejki i wysyłka na serwer. Transkrypcję, notatki
 * i wpis dnia robi serwer (process-recording, build-daily) — AI tylko w supabase/functions
 * (ADR-003, docs/02-architektura.md §6).
 */
export class RecordAndProcessEntryUseCase {
  constructor(
    private audioRecorder: IAudioRecorder,
    private enqueueRecordingUseCase: EnqueueRecordingUseCase,
    private processQueueUseCase?: ProcessRecordingQueueUseCase,
  ) {}

  async startRecording(): Promise<void> {
    await this.audioRecorder.startRecording();
  }

  getCurrentMetering(): number {
    return this.audioRecorder.getCurrentMetering();
  }

  getRecordingDuration(): number {
    return this.audioRecorder.getRecordingDuration();
  }

  async stopRecordingAndProcess(): Promise<QueuedRecording> {
    const audioUri = await this.audioRecorder.stopRecording();
    if (!audioUri) {
      throw new Error('No audio recorded');
    }
    const durationMs = this.audioRecorder.getRecordingDuration();

    // 1. Nagranie trafia do lokalnej kolejki SQLite zanim cokolwiek zostanie wysłane
    const queued = await this.enqueueRecordingUseCase.execute({
      tempUri: audioUri,
      durationMs,
      source: 'phone',
    });

    // 2. Wysyłka kolejki w tle; błąd sieci zostawia nagranie w kolejce do ponowienia
    if (this.processQueueUseCase) {
      this.processQueueUseCase.processPending().catch(() => {});
    }

    return queued;
  }
}
