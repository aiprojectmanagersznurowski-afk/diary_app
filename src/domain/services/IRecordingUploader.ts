import { QueuedRecording } from '../models/QueuedRecording';

export interface IRecordingUploader {
  /**
   * Wysyła nagranie (upload do Storage + INSERT recordings w Supabase).
   * Rzuca błąd w przypadku problemów sieciowych lub serwerowych.
   */
  upload(recording: QueuedRecording): Promise<void>;
}
