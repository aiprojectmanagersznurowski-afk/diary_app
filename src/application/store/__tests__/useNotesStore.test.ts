import { useNotesStore, setNotesDependencies } from '../useNotesStore';
import { IRecordingRepository } from '../../../domain/repositories/IRecordingRepository';
import { INoteRepository } from '../../../domain/repositories/INoteRepository';
import { Recording } from '../../../domain/models/Recording';
import { NoteDocument } from '../../../domain/models/NoteDocument';

describe('useNotesStore', () => {
  let mockRecordingRepo: jest.Mocked<IRecordingRepository>;
  let mockNoteRepo: jest.Mocked<INoteRepository>;

  const sampleRecording: Recording = {
    id: 'rec-1',
    userId: 'user-1',
    source: 'phone',
    recordedAt: '2026-09-27T10:00:00Z',
    status: 'uploaded',
    attempts: 0,
  };

  const sampleNote: NoteDocument = {
    id: 'note-1',
    userId: 'user-1',
    kind: 'note',
    noteType: 'idea',
    day: '2026-09-27',
    title: 'Nowy pomysł',
    slug: '2026-09-27-nowy-pomysl',
    bodyMd: '# Nowy pomysł\n\nTreść',
    content: 'Treść',
    tags: ['ai'],
    createdAt: '2026-09-27T10:05:00Z',
  };

  beforeEach(() => {
    useNotesStore.getState().clear();

    mockRecordingRepo = {
      getRecordings: jest.fn().mockResolvedValue([sampleRecording]),
      retryRecording: jest.fn().mockResolvedValue(undefined),
      subscribeToRecordings: jest.fn().mockReturnValue(jest.fn()),
    };

    mockNoteRepo = {
      getNotes: jest.fn().mockResolvedValue([sampleNote]),
      subscribeToNotes: jest.fn().mockReturnValue(jest.fn()),
    };

    setNotesDependencies({
      recordingRepository: mockRecordingRepo,
      noteRepository: mockNoteRepo,
    });
  });

  it('fetchRecordings fetches and stores recordings', async () => {
    await useNotesStore.getState().fetchRecordings();
    expect(mockRecordingRepo.getRecordings).toHaveBeenCalledTimes(1);
    expect(useNotesStore.getState().recordings).toEqual([sampleRecording]);
  });

  it('fetchNotes fetches and stores notes', async () => {
    await useNotesStore.getState().fetchNotes();
    expect(mockNoteRepo.getNotes).toHaveBeenCalledTimes(1);
    expect(useNotesStore.getState().notes).toEqual([sampleNote]);
  });

  it('updateRecordingRealtime updates existing recording without page refresh', () => {
    useNotesStore.setState({ recordings: [sampleRecording] });

    const updated: Recording = {
      ...sampleRecording,
      status: 'transcribed',
    };

    useNotesStore.getState().updateRecordingRealtime(updated);
    const stored = useNotesStore.getState().recordings;
    expect(stored).toHaveLength(1);
    expect(stored[0].status).toBe('transcribed');
  });

  it('updateRecordingRealtime prepends new recording if not present', () => {
    useNotesStore.setState({ recordings: [sampleRecording] });

    const newRec: Recording = {
      id: 'rec-2',
      userId: 'user-1',
      source: 'watch',
      recordedAt: '2026-09-27T11:00:00Z',
      status: 'uploaded',
      attempts: 0,
    };

    useNotesStore.getState().updateRecordingRealtime(newRec);
    const stored = useNotesStore.getState().recordings;
    expect(stored).toHaveLength(2);
    expect(stored[0].id).toBe('rec-2');
  });

  it('retryRecording performs optimistic update and calls repository', async () => {
    const failedRec: Recording = {
      ...sampleRecording,
      status: 'failed',
      lastError: 'Błąd sieci',
    };
    useNotesStore.setState({ recordings: [failedRec] });

    await useNotesStore.getState().retryRecording(failedRec.id);

    expect(mockRecordingRepo.retryRecording).toHaveBeenCalledWith(failedRec.id);
    const current = useNotesStore.getState().recordings.find((r) => r.id === failedRec.id);
    expect(current?.status).toBe('uploaded');
    expect(current?.lastError).toBeNull();
  });

  it('addOrUpdateNoteRealtime adds new note to state', () => {
    useNotesStore.setState({ notes: [sampleNote] });

    const newNote: NoteDocument = {
      id: 'note-2',
      userId: 'user-1',
      kind: 'note',
      noteType: 'task',
      day: '2026-09-27',
      title: 'Zadanie domowe',
      slug: '2026-09-27-zadanie',
      bodyMd: '# Zadanie',
      content: 'Zadanie',
      tags: [],
      createdAt: '2026-09-27T11:00:00Z',
    };

    useNotesStore.getState().addOrUpdateNoteRealtime(newNote);
    expect(useNotesStore.getState().notes).toHaveLength(2);
    expect(useNotesStore.getState().notes[0].id).toBe('note-2');
  });

  it('setFilter changes activeFilter', () => {
    expect(useNotesStore.getState().activeFilter).toBe('all');
    useNotesStore.getState().setFilter('task');
    expect(useNotesStore.getState().activeFilter).toBe('task');
  });

  it('subscribeToRealtime calls repository subscriptions and returns cleanup function', () => {
    const unsub = useNotesStore.getState().subscribeToRealtime('user-1');
    expect(mockRecordingRepo.subscribeToRecordings).toHaveBeenCalledWith('user-1', expect.any(Function));
    expect(mockNoteRepo.subscribeToNotes).toHaveBeenCalledWith('user-1', expect.any(Function));

    expect(typeof unsub).toBe('function');
  });
});
