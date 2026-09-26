import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { IAudioRecorder } from '../../domain/services/IAudioRecorder';
import { IAiService } from '../../domain/services/IAiService';
import { IDiaryRepository } from '../../domain/repositories/IDiaryRepository';
import { DiaryEntry } from '../../domain/models/DiaryEntry';
import { createRecordAndProcessUseCase } from '../diary';
import { useDiaryStore, setDiaryDependencies } from '../../application/store/useDiaryStore';
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

  beforeEach(() => {
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
      const useCase = createRecordAndProcessUseCase(mockRecorder, mockAi, mockRepo);

      await useCase.startRecording();
      expect(mockRecorder.startRecording).toHaveBeenCalledTimes(1);

      expect(useCase.getCurrentMetering()).toBe(-12.5);
      expect(useCase.getRecordingDuration()).toBe(42);
    });

    it('rzuca błąd gdy zatrzymanie nagrywania nie zwróci URI pliku', async () => {
      mockRecorder.stopRecording.mockResolvedValueOnce(null);
      const useCase = createRecordAndProcessUseCase(mockRecorder, mockAi, mockRepo);

      await expect(useCase.stopRecordingAndProcess()).rejects.toThrow('No audio recorded');
    });

    it('rzuca błąd gdy transkrypcja AI zwróci pusty tekst', async () => {
      mockAi.transcribe.mockResolvedValueOnce('');
      const useCase = createRecordAndProcessUseCase(mockRecorder, mockAi, mockRepo);

      await expect(useCase.stopRecordingAndProcess()).rejects.toThrow('Transcription resulted in empty text');
    });

    it('zapisuje nowy wpis w repozytorium gdy dzisiejszy wpis jeszcze nie istnieje', async () => {
      mockRepo.findByDate.mockResolvedValueOnce(null);
      const useCase = createRecordAndProcessUseCase(mockRecorder, mockAi, mockRepo);

      const entry = await useCase.stopRecordingAndProcess(['Cel 1'], 'Buddha');

      expect(mockRecorder.stopRecording).toHaveBeenCalled();
      expect(mockAi.transcribe).toHaveBeenCalledWith('file://test-audio.m4a');
      expect(mockAi.extractData).toHaveBeenCalledWith('To był wspaniały dzień pełen wrażeń.', ['Cel 1'], 'Buddha');
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(entry).toBeDefined();
      expect(entry?.fullText).toBe('To był wspaniały dzień pełen wrażeń.');
    });

    it('dopisuje treść i aktualizuje istniejący wpis dnia gdy dzisiejszy wpis już istnieje', async () => {
      const existingEntry: DiaryEntry = {
        id: 'existing-entry-id',
        date: new Date(),
        fullText: 'Poranny spacer.',
        parsedData: null,
        createdAt: new Date(),
      };
      mockRepo.findByDate.mockResolvedValueOnce(existingEntry);
      const useCase = createRecordAndProcessUseCase(mockRecorder, mockAi, mockRepo);

      const entry = await useCase.stopRecordingAndProcess(['Cel 1'], 'Buddha');

      expect(mockRepo.update).toHaveBeenCalledTimes(1);
      expect(mockRepo.save).not.toHaveBeenCalled();
      expect(entry).toBeDefined();
      expect(entry?.id).toBe('existing-entry-id');
    });
  });

  describe('useDiaryStore with injected mock dependencies', () => {
    beforeEach(() => {
      act(() => {
        useDiaryStore.getState().clearEntries();
      });
    });

    it('pobiera wpisy przy użyciu wstrzykniętego atrapami IDiaryRepository', async () => {
      const dummyEntries: DiaryEntry[] = [
        {
          id: 'test-1',
          date: new Date(),
          fullText: 'Wpis 1',
          parsedData: null,
          createdAt: new Date(),
        },
      ];
      mockRepo.getAll.mockResolvedValueOnce(dummyEntries);

      setDiaryDependencies({
        diaryRepository: mockRepo,
        recordUseCase: createRecordAndProcessUseCase(mockRecorder, mockAi, mockRepo),
      });

      await act(async () => {
        await useDiaryStore.getState().fetchEntries();
      });

      expect(mockRepo.getAll).toHaveBeenCalledTimes(1);
      expect(useDiaryStore.getState().entries).toEqual(dummyEntries);
    });

    it('wykonuje cykl nagrywania i przetwarzania z atrapami w store', async () => {
      const useCase = createRecordAndProcessUseCase(mockRecorder, mockAi, mockRepo);
      setDiaryDependencies({
        diaryRepository: mockRepo,
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
      expect(mockAi.transcribe).toHaveBeenCalled();
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
});
