import { useRelatedThoughtsStore, setRelatedThoughtsDependencies } from '../useRelatedThoughtsStore';
import { IRelatedThoughtsRepository } from '../../../domain/repositories/IRelatedThoughtsRepository';
import { RelatedThought } from '../../../domain/models/RelatedThought';

describe('useRelatedThoughtsStore', () => {
  let mockRepository: jest.Mocked<IRelatedThoughtsRepository>;

  const sampleThoughts: RelatedThought[] = [
    {
      documentId: 'doc-rel-1',
      title: 'Powiązana notatka',
      kind: 'note',
      noteType: 'task',
      day: '2026-09-21',
      relationType: 'semantic',
      similarity: 0.92,
      reason: 'Wektorowe podobieństwo treści',
    },
  ];

  beforeEach(() => {
    useRelatedThoughtsStore.getState().clear();
    mockRepository = {
      getRelatedThoughts: jest.fn().mockResolvedValue(sampleThoughts),
    };
    setRelatedThoughtsDependencies({ relatedThoughtsRepository: mockRepository });
  });

  afterEach(() => {
    setRelatedThoughtsDependencies({ relatedThoughtsRepository: null });
  });

  it('initializes with default empty state', () => {
    const state = useRelatedThoughtsStore.getState();
    expect(state.items).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.currentDocumentId).toBeNull();
  });

  it('loads related thoughts successfully for a document', async () => {
    await useRelatedThoughtsStore.getState().loadRelatedThoughts('doc-main-1', 5);

    const state = useRelatedThoughtsStore.getState();
    expect(mockRepository.getRelatedThoughts).toHaveBeenCalledWith('doc-main-1', 5);
    expect(state.items).toEqual(sampleThoughts);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.currentDocumentId).toBe('doc-main-1');
  });

  it('handles empty documentId by clearing items without repository call', async () => {
    await useRelatedThoughtsStore.getState().loadRelatedThoughts('');

    const state = useRelatedThoughtsStore.getState();
    expect(state.items).toEqual([]);
    expect(mockRepository.getRelatedThoughts).not.toHaveBeenCalled();
  });

  it('handles fetch error properly', async () => {
    mockRepository.getRelatedThoughts.mockRejectedValueOnce(new Error('Błąd bazy danych'));

    await useRelatedThoughtsStore.getState().loadRelatedThoughts('doc-1');

    const state = useRelatedThoughtsStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Błąd bazy danych');
  });

  it('sets error when repository is not initialized', async () => {
    setRelatedThoughtsDependencies({ relatedThoughtsRepository: null });

    await useRelatedThoughtsStore.getState().loadRelatedThoughts('doc-1');

    const state = useRelatedThoughtsStore.getState();
    expect(state.error).toBe('Repozytorium powiązanych myśli nie zostało zainicjalizowane');
  });

  it('clears state properly', () => {
    useRelatedThoughtsStore.setState({
      items: sampleThoughts,
      currentDocumentId: 'doc-1',
    });

    useRelatedThoughtsStore.getState().clear();

    const state = useRelatedThoughtsStore.getState();
    expect(state.items).toEqual([]);
    expect(state.currentDocumentId).toBeNull();
  });
});
