import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
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
import { IRecordingUploader } from '../domain/services/IRecordingUploader';
import { IRecordingRepository } from '../domain/repositories/IRecordingRepository';
import { INoteRepository } from '../domain/repositories/INoteRepository';
import { SupabaseRecordingRepository } from '../infrastructure/supabase/supabaseRecordingRepository';
import { SupabaseNoteRepository } from '../infrastructure/supabase/supabaseNoteRepository';
import { SupabaseDocumentRepository } from '../infrastructure/supabase/supabaseDocumentRepository';
import { RetryRecordingUseCase } from '../application/useCases/recording/retryRecordingUseCase';
import { GetNotesUseCase } from '../application/useCases/notes/getNotesUseCase';
import { GetDocumentUseCase } from '../application/useCases/documents/getDocumentUseCase';
import { GetDailyDocumentsInRangeUseCase } from '../application/useCases/documents/getDailyDocumentsInRangeUseCase';
import { IDocumentRepository } from '../domain/repositories/IDocumentRepository';
import { setNotesDependencies } from '../application/store/useNotesStore';
import { IngestWatchInboxUseCase } from '../application/useCases/recording/ingestWatchInboxUseCase';
import { ExpoWatchConnectivity } from '../infrastructure/watch/expoWatchConnectivity';
import { IWatchConnectivity } from '../domain/services/IWatchConnectivity';
import { IGraphRepository } from '../domain/repositories/IGraphRepository';
import { SupabaseGraphRepository } from '../infrastructure/supabase/supabaseGraphRepository';
import { setGraphDependencies } from '../application/store/useGraphStore';
import { IRelatedThoughtsRepository } from '../domain/repositories/IRelatedThoughtsRepository';
import { SupabaseRelatedThoughtsRepository } from '../infrastructure/supabase/supabaseRelatedThoughtsRepository';
import { GetRelatedThoughtsUseCase } from '../application/useCases/document/getRelatedThoughtsUseCase';
import { setRelatedThoughtsDependencies } from '../application/store/useRelatedThoughtsStore';
import { IChatRepository } from '../domain/repositories/IChatRepository';
import { SupabaseChatRepository } from '../infrastructure/supabase/supabaseChatRepository';
import { GetChatThreadsUseCase } from '../application/useCases/chat/getChatThreadsUseCase';
import { GetChatMessagesUseCase } from '../application/useCases/chat/getChatMessagesUseCase';
import { SendChatMessageUseCase } from '../application/useCases/chat/sendChatMessageUseCase';
import { setChatDependencies } from '../application/store/useChatStore';

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

export const recordingRepository: IRecordingRepository = new SupabaseRecordingRepository(supabase);
export const noteRepository: INoteRepository = new SupabaseNoteRepository(supabase);
export const documentRepository: IDocumentRepository = new SupabaseDocumentRepository(supabase);
export const graphRepository: IGraphRepository = new SupabaseGraphRepository(supabase);
export const relatedThoughtsRepository: IRelatedThoughtsRepository = new SupabaseRelatedThoughtsRepository(supabase);
export const chatRepository: IChatRepository = new SupabaseChatRepository(supabase);
export const retryRecordingUseCase = new RetryRecordingUseCase(recordingRepository);
export const getNotesUseCase = new GetNotesUseCase(noteRepository);
export const getDocumentUseCase = new GetDocumentUseCase(documentRepository);
export const getDailyDocumentsInRangeUseCase = new GetDailyDocumentsInRangeUseCase(documentRepository);
export const getRelatedThoughtsUseCase = new GetRelatedThoughtsUseCase(relatedThoughtsRepository);
export const getChatThreadsUseCase = new GetChatThreadsUseCase(chatRepository);
export const getChatMessagesUseCase = new GetChatMessagesUseCase(chatRepository);
export const sendChatMessageUseCase = new SendChatMessageUseCase(chatRepository);

// Inicjalizacja domyślnych zależności w store'ach
setDiaryDependencies({
  recordUseCase,
  getDailyDocumentsUseCase: getDailyDocumentsInRangeUseCase,
});

setNotesDependencies({
  recordingRepository,
  noteRepository,
});

setGraphDependencies({
  graphRepository,
});

setRelatedThoughtsDependencies({
  relatedThoughtsRepository,
});

setChatDependencies({
  chatRepository,
});

// F4-04: nagrania z zegarka (docs/02-architektura.md §6.2) trafiają do tej samej kolejki co
// nagrania z telefonu. Uruchamiamy przy starcie appki, po powrocie na pierwszy plan i po każdym
// zdarzeniu z modułu watch-connectivity (nowy plik w inboksie) — te trzy momenty są wymienione
// wprost w kontrakcie F4-04, a jedynym miejscem poza App.tsx, gdzie można je podpiąć bez
// wykraczania poza scope.write tego zadania, jest composition root.
export const watchConnectivity: IWatchConnectivity = new ExpoWatchConnectivity();
export const ingestWatchInboxUseCase = new IngestWatchInboxUseCase(
  watchConnectivity,
  recordingQueue,
  enqueueRecordingUseCase,
);

// F4-06: useNotesStore.updateRecordingRealtime odsyła status nagrań źródła 'watch' z powrotem na
// zegarek. Osobne wywołanie setNotesDependencies (obok tego wyżej) — scala tylko podane klucze,
// nie nadpisuje recordingRepository/noteRepository ustawionych wcześniej.
setNotesDependencies({ watchConnectivity });

ingestWatchInboxUseCase.execute().catch((error) => {
  console.warn('Nie udało się wczytać nagrań z inboksu zegarka przy starcie', error);
});

AppState.addEventListener('change', (nextState) => {
  if (nextState === 'active') {
    ingestWatchInboxUseCase.execute().catch((error) => {
      console.warn('Nie udało się wczytać nagrań z inboksu zegarka po powrocie na pierwszy plan', error);
    });
  }
});

watchConnectivity.subscribeToInboxFiles(() => {
  ingestWatchInboxUseCase.execute().catch((error) => {
    console.warn('Nie udało się wczytać nagrań z inboksu zegarka po zdarzeniu modułu', error);
  });
});
