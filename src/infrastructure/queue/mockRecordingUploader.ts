import { IRecordingUploader } from '../../domain/services/IRecordingUploader';
import { QueuedRecording } from '../../domain/models/QueuedRecording';

/**
 * Atrapa uploadera nagrań do czasu wdrożenia F2-02 (prawdziwy upload do Supabase Storage + INSERT).
 */
export class MockRecordingUploader implements IRecordingUploader {
  private shouldFail = false;
  private failureError: Error = new Error('Błąd symulowanego uploadu');
  public uploadedRecordings: QueuedRecording[] = [];

  setShouldFail(shouldFail: boolean, error?: Error): void {
    this.shouldFail = shouldFail;
    if (error) {
      this.failureError = error;
    }
  }

  async upload(recording: QueuedRecording): Promise<void> {
    if (this.shouldFail) {
      throw this.failureError;
    }
    this.uploadedRecordings.push({ ...recording });
  }

  clear(): void {
    this.uploadedRecordings = [];
    this.shouldFail = false;
  }
}
