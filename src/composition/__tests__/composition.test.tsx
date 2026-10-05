import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { IAudioRecorder } from '../../domain/services/IAudioRecorder';
import { IAiService } from '../../domain/services/IAiService';
import { IDiaryRepository } from '../../domain/repositories/IDiaryRepository';
import { DailyDocument } from '../../domain/models/DailyDocument';
import { dayStringOffsetFromToday } from '../../application/useCases/statsUseCase';
import {
  createRecordAndProcessUseCase,
  ingestWatchInboxAndUpload,
  ingestWatchInboxUseCase,
  processRecordingQueueUseCase,
} from '../diary';
import { setupQueueListener } from '../../infrastructure/queue/queueListener';
import { useDiaryStore, setDiaryDependencies, DAILY_HISTORY_DAYS } from '../../application/store/useDiaryStore';
import {
  DependenciesProvider,
  useDependencies,
  useAuthService,
  useProfileService,
  useOnboardingServices,
  useDiaryServices,
  useRecordingQueueServices,
  AppDependencies,
} from '../context';

jest.mock('../../infrastructure/queue/queueListener', () => ({
  setupQueueListener: jest.fn(() => jest.fn()),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(null),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
    clear: jest.fn().mockResolvedValue(null),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(null),
    multiRemove: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('expo-audio', () => ({
  AudioModule: {},
  RecordingPresets: {},
  requestRecordingPermissionsAsync: jest.fn(),
}));

describe('Composition Root & Use Cases with Mocks', () => {
  let mockRecorder: jest.Mocked<IAudioRecorder>;
  let mockAi: jest.Mocked<IAiService>;
  let mockRepo: jest.Mocked<IDiaryRepository>;
  let mockEnqueue: { execute: jest.Mock };
  let mockProcessQueue: { processPending: jest.Mock };
  const makeRecordUseCase = () =>
    createRecordAndProcessUseCase(mockRecorder, mockEnqueue as any, mockProcessQueue as any);

  beforeEach(() => {
    mockEnqueue = {
      execute: jest.fn().mockResolvedValue({
        id: 'queued-1',
        path: 'file://documents/recordings/queued-1.m4a',
        recordedAt: '2026-10-05T09:10:00.000Z',
        durationMs: 42,
        source: 'phone',
      }),
    };
    mockProcessQueue = {
      processPending: jest.fn().mockResolvedValue({ processed: 1, succeeded: 1, failed: 0, errors: [] }),
    };
    mockRecorder = {
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn().mockResolvedValue('file://test-audio.m4a'),
      getCurrentMetering: jest.fn().mockReturnValue(-12.5),
      getRecordingDuration: jest.fn().mockReturnValue(42),
    };

    mockAi = {
      transcribe: jest.fn().mockResolvedValue('To był wspaniały dzień pełen wrażeń.'),
      extractData: jest.fn().mockResolvedValue({
        full_text: 'To był wspaniały dzień pełen wrażeń.',
        parsedData: {
          dominantThought: 'Wspaniały dzień',
          summary: 'Podsumowanie',
          quotes: [],
          impactOnGoals: 'pozytywny',
          goalImpactType: 'positive',
          completedTasks: [],
          importantEvents: [],
          emotions: ['radość'],
          fatigueLevel: 2,
          stressVsCalm: 'calm',
          gratefulFor: 'spokój',
          triggeredStress: null,
          triggeredAnger: null,
          triggeredJoy: 'spacer',
          triggeredCalm: 'cisza',
          goalAdvice: null,
        },
      }),
      extractLifeGoalsFromTranscript: jest.fn().mockResolvedValue(['Cel 1']),
    };

    mockRepo = {
      save: jest.fn().mockImplementation(async (entry) => ({
        id: 'new-entry-1',
        date: entry.date,
        fullText: entry.fullText,
        parsedData: entry.parsedData,
        createdAt: new Date(),
      })),
      update: jest.fn().mockImplementation(async (id, entry) => ({
        id,
        date: entry.date,
        fullText: entry.fullText,
        parsedData: entry.parsedData,
        createdAt: new Date(),
      })),
      findByDate: jest.fn().mockResolvedValue(null),
      getAll: jest.fn().mockResolvedValue([]),
    };
  });

  describe('createRecordAndProcessUseCase factory', () => {
    it('tworzy przypadek użycia ze wstrzykniętymi atrapami i poprawnie startuje nagrywanie', async () => {
      const useCase = makeRecordUseCase();

      await useCase.startRecording();
      expect(mockRecorder.startRecording).toHaveBeenCalledTimes(1);

      expect(useCase.getCurrentMetering()).toBe(-12.5);
      expect(useCase.getRecordingDuration()).toBe(42);
    });

    it('rzuca błąd gdy zatrzymanie nagrywania nie zwróci URI pliku', async () => {
      mockRecorder.stopRecording.mockResolvedValueOnce(null);
      const useCase = makeRecordUseCase();

      await expect(useCase.stopRecordingAndProcess()).rejects.toThrow('No audio recorded');
      expect(mockEnqueue.execute).not.toHaveBeenCalled();
    });

    it('zapisuje nagranie w kolejce i uruchamia wysyłkę, bez AI w aplikacji (ADR-003)', async () => {
      const useCase = makeRecordUseCase();

      const queued = await useCase.stopRecordingAndProcess();

      expect(mockEnqueue.execute).toHaveBeenCalledWith({
        tempUri: 'file://test-audio.m4a',
        durationMs: 42,
        source: 'phone',
      });
      expect(mockProcessQueue.processPending).toHaveBeenCalledTimes(1);
      expect(queued.id).toBe('queued-1');
      expect(mockAi.transcribe).not.toHaveBeenCalled();
      expect(mockAi.extractData).not.toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('nie zgłasza błędu, gdy wysyłka kolejki się nie powiedzie (nagranie zostaje w kolejce)', async () => {
      mockProcessQueue.processPending.mockRejectedValueOnce(new Error('Network request failed'));
      const useCase = makeRecordUseCase();

      await expect(useCase.stopRecordingAndProcess()).resolves.toMatchObject({ id: 'queued-1' });
      expect(mockEnqueue.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('useDiaryStore with injected mock dependencies', () => {
    beforeEach(() => {
      act(() => {
        useDiaryStore.getState().clearEntries();
      });
    });

    it('pobiera wpisy dnia z documents przez wstrzyknięty use case i sortuje od najnowszego', async () => {
      const older = { id: '11111111-1111-4111-8111-111111111111', day: '2026-10-01' } as DailyDocument;
      const newer = { id: '22222222-2222-4222-8222-222222222222', day: '2026-10-03' } as DailyDocument;
      const getDaily = { execute: jest.fn().mockResolvedValueOnce([older, newer]) };

      setDiaryDependencies({
        getDailyDocumentsUseCase: getDaily as any,
        recordUseCase: makeRecordUseCase(),
      });

      await act(async () => {
        await useDiaryStore.getState().fetchDailyDocuments();
      });

      expect(getDaily.execute).toHaveBeenCalledTimes(1);
      const [startDay, endDay] = getDaily.execute.mock.calls[0];
      expect(startDay).toBe(dayStringOffsetFromToday(-(DAILY_HISTORY_DAYS - 1)));
      expect(endDay).toBe(dayStringOffsetFromToday(0));
      expect(useDiaryStore.getState().dailyDocuments.map((d) => d.id)).toEqual([newer.id, older.id]);
      expect(mockRepo.getAll).not.toHaveBeenCalled();
    });

    it('zapisuje błąd i kończy ładowanie, gdy pobranie wpisów dnia się nie powiedzie', async () => {
      const getDaily = { execute: jest.fn().mockRejectedValueOnce(new Error('sieć')) };
      setDiaryDependencies({ getDailyDocumentsUseCase: getDaily as any });

      await act(async () => {
        await useDiaryStore.getState().fetchDailyDocuments();
      });

      expect(useDiaryStore.getState().isLoading).toBe(false);
      expect(useDiaryStore.getState().error).toContain('sieć');
      expect(useDiaryStore.getState().dailyDocuments).toEqual([]);
    });

    it('wykonuje cykl nagrywania i przetwarzania z atrapami w store', async () => {
      const useCase = makeRecordUseCase();
      setDiaryDependencies({
        getDailyDocumentsUseCase: { execute: jest.fn().mockResolvedValue([]) } as any,
        recordUseCase: useCase,
      });

      await act(async () => {
        await useDiaryStore.getState().startRecording();
      });
      expect(useDiaryStore.getState().isRecording).toBe(true);

      await act(async () => {
        await useDiaryStore.getState().stopRecordingAndProcess();
      });
      expect(useDiaryStore.getState().isProcessing).toBe(false);
      expect(mockRecorder.stopRecording).toHaveBeenCalled();
      expect(mockEnqueue.execute).toHaveBeenCalledTimes(1);
      expect(mockAi.transcribe).not.toHaveBeenCalled();
    });
  });

  describe('DependenciesProvider & Context Hooks', () => {
    it('wstrzykuje atrapy do drzewa komponentów React przez DependenciesProvider', () => {
      const mockAuthService = {
        signInWithGoogle: jest.fn(),
        signInWithApple: jest.fn(),
        signOut: jest.fn(),
        getCurrentUser: jest.fn(),
        onAuthStateChange: jest.fn(),
      };

      const mockProfileService = {
        getProfile: jest.fn(),
        saveProfile: jest.fn(),
        completeOnboarding: jest.fn(),
      };

      const customDeps: Partial<AppDependencies> = {
        authService: mockAuthService as any,
        profileService: mockProfileService as any,
        audioRecorder: mockRecorder,
        aiService: mockAi,
        diaryRepository: mockRepo,
      };

      let capturedDeps: AppDependencies | null = null;
      let capturedAuth: any = null;
      let capturedProfile: any = null;
      let capturedOnboarding: any = null;
      let capturedDiary: any = null;
      let capturedQueue: any = null;

      const TestComponent = () => {
        capturedDeps = useDependencies();
        capturedAuth = useAuthService();
        capturedProfile = useProfileService();
        capturedOnboarding = useOnboardingServices();
        capturedDiary = useDiaryServices();
        capturedQueue = useRecordingQueueServices();
        return null;
      };

      act(() => {
        renderer.create(
          <DependenciesProvider dependencies={customDeps}>
            <TestComponent />
          </DependenciesProvider>,
        );
      });

      expect(capturedDeps).not.toBeNull();
      expect(capturedAuth).toBe(mockAuthService);
      expect(capturedProfile).toBe(mockProfileService);
      expect(capturedOnboarding.audioRecorder).toBe(mockRecorder);
      expect(capturedOnboarding.aiService).toBe(mockAi);
      expect(capturedDiary.diaryRepository).toBe(mockRepo);
      expect(capturedQueue).toBeDefined();
      expect(capturedQueue.recordingQueue).toBeDefined();
    });
  });

  describe('ponawianie wysyłki kolejki nagrań (F2-10)', () => {
    it('rejestruje nasłuch kolejki z procesorem kolejki z composition root', () => {
      expect(setupQueueListener).toHaveBeenCalledWith(processRecordingQueueUseCase);
    });

    it('po wczytaniu inboksu zegarka od razu uruchamia wysyłkę kolejki', async () => {
      const calls: string[] = [];
      const ingest = jest.spyOn(ingestWatchInboxUseCase, 'execute').mockImplementation(async () => {
        calls.push('ingest');
      });
      const upload = jest.spyOn(processRecordingQueueUseCase, 'processPending').mockImplementation(async () => {
        calls.push('upload');
        return { processed: 0, succeeded: 0, failed: 0, errors: [] };
      });

      await ingestWatchInboxAndUpload();

      expect(calls).toEqual(['ingest', 'upload']);
      ingest.mockRestore();
      upload.mockRestore();
    });
  });
});
