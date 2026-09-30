import { create } from 'zustand';
import { Recording, RecordingStatus } from '../../domain/models/Recording';
import { NoteDocument, NoteType } from '../../domain/models/NoteDocument';
import { IRecordingRepository } from '../../domain/repositories/IRecordingRepository';
import { INoteRepository } from '../../domain/repositories/INoteRepository';
import { IWatchConnectivity } from '../../domain/services/IWatchConnectivity';

let activeRecordingRepository: IRecordingRepository | null = null;
let activeNoteRepository: INoteRepository | null = null;
let activeWatchConnectivity: IWatchConnectivity | null = null;

export const setNotesDependencies = (deps: {
  recordingRepository?: IRecordingRepository | null;
  noteRepository?: INoteRepository | null;
  watchConnectivity?: IWatchConnectivity | null;
}) => {
  if (deps.recordingRepository !== undefined) {
    activeRecordingRepository = deps.recordingRepository;
  }
  if (deps.noteRepository !== undefined) {
    activeNoteRepository = deps.noteRepository;
  }
  if (deps.watchConnectivity !== undefined) {
    activeWatchConnectivity = deps.watchConnectivity;
  }
};

export interface NotesState {
  recordings: Recording[];
  notes: NoteDocument[];
  activeFilter: NoteType | 'all';
  isLoadingRecordings: boolean;
  isLoadingNotes: boolean;
  error: string | null;

  setFilter: (filter: NoteType | 'all') => void;
  fetchRecordings: () => Promise<void>;
  fetchNotes: (day?: string) => Promise<void>;
  retryRecording: (id: string) => Promise<void>;
  updateRecordingRealtime: (recording: Recording) => void;
  addOrUpdateNoteRealtime: (note: NoteDocument) => void;
  subscribeToRealtime: (userId: string) => () => void;
  clear: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  recordings: [],
  notes: [],
  activeFilter: 'all',
  isLoadingRecordings: false,
  isLoadingNotes: false,
  error: null,

  setFilter: (filter) => set({ activeFilter: filter }),

  clear: () => {
    set({
      recordings: [],
      notes: [],
      activeFilter: 'all',
      isLoadingRecordings: false,
      isLoadingNotes: false,
      error: null,
    });
  },

  fetchRecordings: async () => {
    if (!activeRecordingRepository) return;
    set({ isLoadingRecordings: true, error: null });
    try {
      const recordings = await activeRecordingRepository.getRecordings();
      set({ recordings, isLoadingRecordings: false });
    } catch (err: unknown) {
      set({ error: String(err), isLoadingRecordings: false });
    }
  },

  fetchNotes: async (day?: string) => {
    if (!activeNoteRepository) return;
    set({ isLoadingNotes: true, error: null });
    try {
      const notes = await activeNoteRepository.getNotes(day);
      set({ notes, isLoadingNotes: false });
    } catch (err: unknown) {
      set({ error: String(err), isLoadingNotes: false });
    }
  },

  retryRecording: async (id: string) => {
    if (!activeRecordingRepository) return;
    set({ error: null });
    try {
      // Optymistyczna zmiana statusu w UI
      set((state) => ({
        recordings: state.recordings.map((r) =>
          r.id === id ? { ...r, status: 'uploaded' as RecordingStatus, lastError: null } : r,
        ),
      }));
      await activeRecordingRepository.retryRecording(id);
    } catch (err: unknown) {
      set({ error: String(err) });
      // W razie błędu odśwież stan z bazy
      await get().fetchRecordings();
    }
  },

  updateRecordingRealtime: (recording: Recording) => {
    set((state) => {
      const exists = state.recordings.some((r) => r.id === recording.id);
      const newRecordings = exists
        ? state.recordings.map((r) => (r.id === recording.id ? recording : r))
        : [recording, ...state.recordings];

      return { recordings: newRecordings };
    });

    // Gdy nagranie zostało pomyślnie przetworzone, pobierz nowe notatki
    if (recording.status === 'done') {
      get()
        .fetchNotes()
        .catch(() => {});
    }

    // F4-06: nagrania z zegarka odsyłają status z powrotem na zegarek (F4-05). Nagrania z
    // telefonu/weba nie mają po co tam trafiać.
    if (recording.source === 'watch' && activeWatchConnectivity) {
      activeWatchConnectivity.sendRecordingStatus(recording.id, recording.status).catch(() => {});
    }
  },

  addOrUpdateNoteRealtime: (note: NoteDocument) => {
    set((state) => {
      const exists = state.notes.some((n) => n.id === note.id);
      const newNotes = exists ? state.notes.map((n) => (n.id === note.id ? note : n)) : [note, ...state.notes];

      return { notes: newNotes };
    });
  },

  subscribeToRealtime: (userId: string) => {
    if (!userId) return () => {};

    const unsubRecordings = activeRecordingRepository
      ? activeRecordingRepository.subscribeToRecordings(userId, (rec) => {
          get().updateRecordingRealtime(rec);
        })
      : () => {};

    const unsubNotes = activeNoteRepository
      ? activeNoteRepository.subscribeToNotes(userId, (note) => {
          get().addOrUpdateNoteRealtime(note);
        })
      : () => {};

    return () => {
      unsubRecordings();
      unsubNotes();
    };
  },
}));
