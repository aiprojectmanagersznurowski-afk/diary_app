import { create } from 'zustand';
import { GraphData, GraphFilters, GraphNode } from '../../domain/models/Graph';
import { IGraphRepository } from '../../domain/repositories/IGraphRepository';

let activeGraphRepository: IGraphRepository | null = null;

export const setGraphDependencies = (deps: { graphRepository?: IGraphRepository | null }) => {
  if (deps.graphRepository !== undefined) {
    activeGraphRepository = deps.graphRepository;
  }
};

export const getGraphRepository = () => activeGraphRepository;

export interface GraphState {
  data: GraphData;
  isLoading: boolean;
  error: string | null;
  selectedNode: GraphNode | null;
  filters: GraphFilters;

  setFilters: (filters: Partial<GraphFilters>) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  fetchGraph: () => Promise<void>;
  clear: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  data: { nodes: [], links: [] },
  isLoading: false,
  error: null,
  selectedNode: null,
  filters: {},

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  setSelectedNode: (node) => {
    set({ selectedNode: node });
  },

  fetchGraph: async () => {
    const repository = activeGraphRepository;
    if (!repository) {
      set({ error: 'Repozytorium grafu nie zostało zainicjalizowane', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const graphData = await repository.getGraph(get().filters);
      set({ data: graphData, isLoading: false, error: null });
    } catch (err: any) {
      set({
        error: err?.message || 'Nie udało się pobrać danych grafu',
        isLoading: false,
      });
    }
  },

  clear: () => {
    set({
      data: { nodes: [], links: [] },
      isLoading: false,
      error: null,
      selectedNode: null,
      filters: {},
    });
  },
}));
