import { audioRecorder, aiService } from './onboarding';
import { InMemoryDiaryRepository } from '../infrastructure/db/diaryRepository';
import { RecordAndProcessEntryUseCase } from '../application/useCases/recordAndProcess';
import { setDiaryDependencies } from '../application/store/useDiaryStore';
import { IAudioRecorder } from '../domain/services/IAudioRecorder';
import { IAiService } from '../domain/services/IAiService';
import { IDiaryRepository } from '../domain/repositories/IDiaryRepository';

export function createRecordAndProcessUseCase(
  recorder: IAudioRecorder,
  ai: IAiService,
  repo: IDiaryRepository,
): RecordAndProcessEntryUseCase {
  return new RecordAndProcessEntryUseCase(recorder, ai, repo);
}

export const diaryRepository: IDiaryRepository = new InMemoryDiaryRepository();
export const recordUseCase: RecordAndProcessEntryUseCase = createRecordAndProcessUseCase(
  audioRecorder,
  aiService,
  diaryRepository,
);

// Inicjalizacja domyślnych zależności w store'ze pamiętnika
setDiaryDependencies({
  recordUseCase,
  diaryRepository,
});
