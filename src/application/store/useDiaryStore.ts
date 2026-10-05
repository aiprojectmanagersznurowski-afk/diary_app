import { create } from 'zustand';
import { DailyDocument } from '../../domain/models/DailyDocument';
import { RecordAndProcessEntryUseCase } from '../useCases/recordAndProcess';
import { GetDailyDocumentsInRangeUseCase } from '../useCases/documents/getDailyDocumentsInRangeUseCase';
import { dayStringOffsetFromToday } from '../useCases/statsUseCase';

/** Ile dni wstecz (włącznie z dzisiejszym) ładuje lista wpisów dnia na ekranie głównym. */
export const DAILY_HISTORY_DAYS = 90;

let activeRecordUseCase: RecordAndProcessEntryUseCase | null = null;
let activeGetDailyDocuments: GetDailyDocumentsInRangeUseCase | null = null;

export const setDiaryDependencies = (deps: {
  recordUseCase?: RecordAndProcessEntryUseCase | null;
  getDailyDocumentsUseCase?: GetDailyDocumentsInRangeUseCase | null;
}) => {
  if (deps.recordUseCase !== undefined) {
    activeRecordUseCase = deps.recordUseCase;
  }
  if (deps.getDailyDocumentsUseCase !== undefined) {
    activeGetDailyDocuments = deps.getDailyDocumentsUseCase;
  }
};

interface DiaryState {
  /** Wpisy dnia (documents, kind = daily), od najnowszego. */
  dailyDocuments: DailyDocument[];
  isLoading: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  fetchDailyDocuments: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecordingAndProcess: () => Promise<void>;
  getCurrentMetering: () => number;
  getRecordingDuration: () => number;
  clearEntries: () => void;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  dailyDocuments: [],
  isLoading: false,
  isRecording: false,
  isProcessing: false,
  error: null,

  clearEntries: () => {
    set({
      dailyDocuments: [],
      isLoading: false,
      isRecording: false,
      isProcessing: false,
      error: null,
    });
  },

  fetchDailyDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      if (!activeGetDailyDocuments) {
        set({ dailyDocuments: [], isLoading: false });
        return;
      }
      const startDay = dayStringOffsetFromToday(-(DAILY_HISTORY_DAYS - 1));
      const endDay = dayStringOffsetFromToday(0);
      const docs = await activeGetDailyDocuments.execute(startDay, endDay);
      set({ dailyDocuments: [...docs].sort((a, b) => b.day.localeCompare(a.day)), isLoading: false });
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
      // Nagranie trafia do kolejki i na serwer; notatki i wpis dnia buduje serwer (ADR-003)
      await activeRecordUseCase.stopRecordingAndProcess();
      set({ isProcessing: false });
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
