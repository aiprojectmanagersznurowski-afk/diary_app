import { audioRecorder, aiService } from './onboarding';
import { InMemoryDiaryRepository } from '../infrastructure/db/diaryRepository';
import { RecordAndProcessEntryUseCase } from '../application/useCases/recordAndProcess';
import { EnqueueRecordingUseCase } from '../application/useCases/recording/enqueueRecordingUseCase';
import { ProcessRecordingQueueUseCase } from '../application/useCases/recording/processRecordingQueueUseCase';
import { SqliteRecordingQueue } from '../infrastructure/queue/sqliteRecordingQueue';
import { ExpoFileStorage } from '../infrastructure/audio/expoFileStorage';
import { supabase } from '../infrastructure/supabase/supabaseClient';
import { SupabaseRecordingUploader } from '../infrastructure/supabase/supabaseRecordingUploader';
import { setDiaryDependencies } from '../application/store/useDiaryStore';
import { IAudioRecorder } from '../domain/services/IAudioRecorder';
import { IAiService } from '../domain/services/IAiService';
import { IDiaryRepository } from '../domain/repositories/IDiaryRepository';
import { IRecordingQueue } from '../domain/services/IRecordingQueue';
import { IFileStorage } from '../domain/services/IFileStorage';
import * as Crypto from 'expo-crypto';
import { IRecordingUploader } from '../domain/services/IRecordingUploader';

export function createRecordAndProcessUseCase(
  recorder: IAudioRecorder,
  ai: IAiService,
  repo: IDiaryRepository,
  enqueueUseCase?: EnqueueRecordingUseCase,
  processQueueUseCase?: ProcessRecordingQueueUseCase,
): RecordAndProcessEntryUseCase {
  return new RecordAndProcessEntryUseCase(recorder, ai, repo, enqueueUseCase, processQueueUseCase);
}

export const recordingQueue: IRecordingQueue = new SqliteRecordingQueue();
export const fileStorage: IFileStorage = new ExpoFileStorage();
export const recordingUploader: IRecordingUploader = new SupabaseRecordingUploader(supabase);

export const enqueueRecordingUseCase = new EnqueueRecordingUseCase(recordingQueue, fileStorage, () =>
  Crypto.randomUUID(),
);
export const processRecordingQueueUseCase = new ProcessRecordingQueueUseCase(
  recordingQueue,
  recordingUploader,
  fileStorage,
);

export const diaryRepository: IDiaryRepository = new InMemoryDiaryRepository();
export const recordUseCase: RecordAndProcessEntryUseCase = createRecordAndProcessUseCase(
  audioRecorder,
  aiService,
  diaryRepository,
  enqueueRecordingUseCase,
  processRecordingQueueUseCase,
);

// Inicjalizacja domyślnych zależności w store'ze pamiętnika
setDiaryDependencies({
  recordUseCase,
  diaryRepository,
});
