import { create } from 'zustand';
import { useSettingsStore } from './useSettingsStore';
import { useGamificationStore } from './useGamificationStore';
import { DiaryEntry } from '../../domain/models/DiaryEntry';
import { IDiaryRepository } from '../../domain/repositories/IDiaryRepository';
import { RecordAndProcessEntryUseCase } from '../useCases/recordAndProcess';

let activeRecordUseCase: RecordAndProcessEntryUseCase | null = null;
let activeDiaryRepository: IDiaryRepository | null = null;

export const setDiaryDependencies = (deps: {
  recordUseCase?: RecordAndProcessEntryUseCase | null;
  diaryRepository?: IDiaryRepository | null;
}) => {
  if (deps.recordUseCase !== undefined) {
    activeRecordUseCase = deps.recordUseCase;
  }
  if (deps.diaryRepository !== undefined) {
    activeDiaryRepository = deps.diaryRepository;
  }
};

interface DiaryState {
  entries: DiaryEntry[];
  isLoading: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  fetchEntries: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecordingAndProcess: () => Promise<void>;
  getCurrentMetering: () => number;
  getRecordingDuration: () => number;
  clearEntries: () => void;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  isLoading: false,
  isRecording: false,
  isProcessing: false,
  error: null,

  clearEntries: () => {
    set({
      entries: [],
      isLoading: false,
      isRecording: false,
      isProcessing: false,
      error: null,
    });
  },

  fetchEntries: async () => {
    set({ isLoading: true, error: null });
    try {
      if (!activeDiaryRepository) {
        set({ entries: [], isLoading: false });
        return;
      }
      const entries = await activeDiaryRepository.getAll();
      set({ entries, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  startRecording: async () => {
    set({ error: null, isRecording: true });
    try {
      if (!activeRecordUseCase) throw new Error('RecordUseCase is not initialized');
      await activeRecordUseCase.startRecording();
    } catch (error) {
      set({ error: String(error), isRecording: false });
    }
  },

  stopRecordingAndProcess: async () => {
    set({ isRecording: false, isProcessing: true });
    try {
      if (!activeRecordUseCase) throw new Error('RecordUseCase is not initialized');
      const { lifeGoals, aiPersonality } = useSettingsStore.getState();
      const newEntry = await activeRecordUseCase.stopRecordingAndProcess(lifeGoals, aiPersonality);
      if (newEntry) {
        useGamificationStore.getState().processNewEntry(newEntry.createdAt.toISOString());
        await get().fetchEntries();
        set({ isProcessing: false });
      } else {
        set({ isProcessing: false });
      }
    } catch (error) {
      set({ error: String(error), isProcessing: false });
    }
  },

  getCurrentMetering: () => {
    return activeRecordUseCase?.getCurrentMetering() ?? 0;
  },

  getRecordingDuration: () => {
    return activeRecordUseCase?.getRecordingDuration() ?? 0;
  },
}));
