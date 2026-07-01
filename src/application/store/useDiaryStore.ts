import { create } from 'zustand';
import { useSettingsStore } from './useSettingsStore';
import { DiaryEntry } from '../../domain/models/DiaryEntry';
import { ExpoAvAudioRecorder } from '../../infrastructure/audio/expoAudioRecorder';
import { GroqAiService } from '../../infrastructure/ai/groqService';
import { FirestoreDiaryRepository } from '../../infrastructure/db/diaryRepository';
import { RecordAndProcessEntryUseCase } from '../useCases/recordAndProcess';

const audioRecorder = new ExpoAvAudioRecorder();
const aiService = new GroqAiService();
const diaryRepository = new FirestoreDiaryRepository();
const recordUseCase = new RecordAndProcessEntryUseCase(audioRecorder, aiService, diaryRepository);

interface DiaryState {
  entries: DiaryEntry[];
  isLoading: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  fetchEntries: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecordingAndProcess: () => Promise<void>;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  isLoading: false,
  isRecording: false,
  isProcessing: false,
  error: null,

  fetchEntries: async () => {
    set({ isLoading: true, error: null });
    try {
      const entries = await diaryRepository.getAll();
      set({ entries, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  startRecording: async () => {
    set({ error: null, isRecording: true });
    try {
      await recordUseCase.startRecording();
    } catch (error) {
      set({ error: String(error), isRecording: false });
    }
  },

  stopRecordingAndProcess: async () => {
    set({ isRecording: false, isProcessing: true });
    try {
      const { lifeGoals } = useSettingsStore.getState();
      const newEntry = await recordUseCase.stopRecordingAndProcess(lifeGoals);
      if (newEntry) {
        await get().fetchEntries();
        set({ isProcessing: false });
      } else {
        set({ isProcessing: false });
      }
    } catch (error) {
      set({ error: String(error), isProcessing: false });
    }
  },
}));
