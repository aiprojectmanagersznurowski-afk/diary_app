import { Recording } from '../models/Recording';

export interface IRecordingRepository {
  getRecordings(): Promise<Recording[]>;
  retryRecording(id: string): Promise<void>;
  subscribeToRecordings(userId: string, onUpdate: (recording: Recording) => void): () => void;
}
