import { IRecordingQueue } from '../../../domain/services/IRecordingQueue';
import { IFileStorage } from '../../../domain/services/IFileStorage';
import { QueuedRecording, RecordingSource } from '../../../domain/models/QueuedRecording';

export interface EnqueueRecordingParams {
  tempUri: string;
  durationMs: number;
  source?: RecordingSource;
  id?: string;
}

export class EnqueueRecordingUseCase {
  constructor(
    private recordingQueue: IRecordingQueue,
    private fileStorage: IFileStorage,
    private idGenerator: () => string,
  ) {}

  async execute(params: EnqueueRecordingParams): Promise<QueuedRecording> {
    const id = params.id ?? this.idGenerator();

    // 1. Przenosimy plik do trwałego katalogu aplikacji (zabezpieczenie przed skasowaniem cache)
    const permanentPath = await this.fileStorage.moveToPermanent(params.tempUri, id);

    // 2. Dodajemy wpis do lokalnej bazy kolejki (expo-sqlite)
    const queuedRecording = await this.recordingQueue.enqueue({
      id,
      path: permanentPath,
      recordedAt: new Date().toISOString(),
      durationMs: params.durationMs,
      source: params.source ?? 'phone',
    });

    return queuedRecording;
  }
}
