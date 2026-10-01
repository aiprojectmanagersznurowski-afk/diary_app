import { useGraphStore, setGraphDependencies } from '../useGraphStore';
import { IGraphRepository } from '../../../domain/repositories/IGraphRepository';
import { GraphData } from '../../../domain/models/Graph';

describe('useGraphStore', () => {
  let mockRepository: jest.Mocked<IGraphRepository>;

  const mockGraphData: GraphData = {
    nodes: [
      {
        id: 'node-1',
        kind: 'note',
        noteType: 'idea',
        day: '2026-09-23',
        title: 'Pomysł 1',
        slug: 'pomysl-1',
        tags: [],
        createdAt: '2026-09-23T10:00:00Z',
      },
    ],
    links: [
      {
        source: 'node-1',
        target: 'node-2',
        sourceId: 'node-1',
        targetId: 'node-2',
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
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.selectedNode).toBeNull();
  });

  it('fetches graph data successfully using active repository', async () => {
    await useGraphStore.getState().fetchGraph();

    const state = useGraphStore.getState();
    expect(mockRepository.getGraph).toHaveBeenCalledWith({});
    expect(state.data).toEqual(mockGraphData);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('passes filters to repository getGraph', async () => {
    useGraphStore.getState().setFilters({ dateFrom: '2026-09-01', noteTypes: ['idea'] });

    await useGraphStore.getState().fetchGraph();

    expect(mockRepository.getGraph).toHaveBeenCalledWith({
      dateFrom: '2026-09-01',
      noteTypes: ['idea'],
    });
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
  });
});
