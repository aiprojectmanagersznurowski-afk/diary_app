import { useGraphStore, setGraphDependencies } from '../useGraphStore';
import { IGraphRepository } from '../../../domain/repositories/IGraphRepository';
import { GraphData } from '../../../domain/models/Graph';

describe('useGraphStore', () => {
  let mockRepository: jest.Mocked<IGraphRepository>;

  const mockGraphData: GraphData = {
    nodes: [
      {
        id: 'daily-1',
        kind: 'daily',
        day: '2026-09-23',
        title: '2026-09-23',
        slug: '2026-09-23',
        tags: [],
        createdAt: '2026-09-23T00:00:00Z',
      },
      {
        id: 'note-1',
        kind: 'note',
        noteType: 'idea',
        day: '2026-09-23',
        title: 'Pomysł 1',
        slug: 'pomysl-1',
        categoryId: 'cat-work',
        categoryName: 'Praca',
        categoryColor: '#3B82F6',
        tags: [],
        createdAt: '2026-09-23T10:00:00Z',
      },
      {
        id: 'note-2',
        kind: 'note',
        noteType: 'task',
        day: '2026-09-20',
        title: 'Zadanie 1',
        slug: 'zadanie-1',
        categoryId: 'cat-home',
        categoryName: 'Dom',
        tags: [],
        createdAt: '2026-09-20T12:00:00Z',
      },
    ],
    links: [
      {
        source: 'daily-1',
        target: 'note-1',
        sourceId: 'daily-1',
        targetId: 'note-1',
        kind: 'day',
      },
      {
        source: 'note-1',
        target: 'note-2',
        sourceId: 'note-1',
        targetId: 'note-2',
        kind: 'semantic',
        score: 0.85,
      },
    ],
  };

  beforeEach(() => {
    useGraphStore.getState().clear();
    mockRepository = {
      getGraph: jest.fn().mockResolvedValue(mockGraphData),
    };
    setGraphDependencies({ graphRepository: mockRepository });
  });

  afterEach(() => {
    setGraphDependencies({ graphRepository: null });
  });

  it('initializes with default empty state', () => {
    const state = useGraphStore.getState();
    expect(state.data).toEqual({ nodes: [], links: [] });
    expect(state.rawGraphData).toEqual({ nodes: [], links: [] });
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.selectedNode).toBeNull();
  });

  it('fetches graph data successfully and extracts categories', async () => {
    await useGraphStore.getState().fetchGraph();

    const state = useGraphStore.getState();
    expect(mockRepository.getGraph).toHaveBeenCalledTimes(1);
    expect(state.rawGraphData).toEqual(mockGraphData);
    expect(state.data).toEqual(mockGraphData);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.availableCategories).toHaveLength(2);
    expect(state.availableCategories[0].name).toBe('Praca');
    expect(state.categoryColors['cat-work']).toBe('#3B82F6');
  });

  it('filters data locally without triggering a new network request when setFilters is called', async () => {
    await useGraphStore.getState().fetchGraph();
    expect(mockRepository.getGraph).toHaveBeenCalledTimes(1);

    // Zmiana filtrów lokalnie: wybieramy tylko typ 'idea'
    useGraphStore.getState().setFilters({ noteTypes: ['idea'] });

    // Repozytorium NIE powinno być ponownie wołane!
    expect(mockRepository.getGraph).toHaveBeenCalledTimes(1);

    const state = useGraphStore.getState();
    // Daily node zachowane jako węzeł centralny, note-1 (idea) zachowana, note-2 (task) odfiltrowana
    expect(state.data.nodes.map((n) => n.id)).toEqual(['daily-1', 'note-1']);
    // Link między daily-1 i note-1 zachowany, link do note-2 usunięty
    expect(state.data.links.map((l) => l.sourceId)).toEqual(['daily-1']);
  });

  it('resets filters and restores full graph data from rawGraphData', async () => {
    await useGraphStore.getState().fetchGraph();
    useGraphStore.getState().setFilters({ noteTypes: ['task'] });

    expect(useGraphStore.getState().data.nodes).toHaveLength(2); // daily-1 i note-2

    useGraphStore.getState().resetFilters();
    expect(useGraphStore.getState().data.nodes).toHaveLength(3);
    expect(useGraphStore.getState().filters).toEqual({});
  });

  it('handles fetch error properly', async () => {
    mockRepository.getGraph.mockRejectedValueOnce(new Error('Network failure'));

    await useGraphStore.getState().fetchGraph();

    const state = useGraphStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Network failure');
  });

  it('sets error when repository is not initialized', async () => {
    setGraphDependencies({ graphRepository: null });

    await useGraphStore.getState().fetchGraph();

    const state = useGraphStore.getState();
    expect(state.error).toBe('Repozytorium grafu nie zostało zainicjalizowane');
  });

  it('updates selected node and clears state', () => {
    useGraphStore.getState().setSelectedNode(mockGraphData.nodes[0]);
    expect(useGraphStore.getState().selectedNode).toEqual(mockGraphData.nodes[0]);

    useGraphStore.getState().clear();
    expect(useGraphStore.getState().selectedNode).toBeNull();
    expect(useGraphStore.getState().data).toEqual({ nodes: [], links: [] });
    expect(useGraphStore.getState().rawGraphData).toEqual({ nodes: [], links: [] });
  });
});
