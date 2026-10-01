import { create } from 'zustand';
import { GraphCategory, GraphData, GraphFilters, GraphNode } from '../../domain/models/Graph';
import { IGraphRepository } from '../../domain/repositories/IGraphRepository';
import { filterGraphData } from '../useCases/graph/filterGraphData';

let activeGraphRepository: IGraphRepository | null = null;
let activeFetchCategories: (() => Promise<GraphCategory[]>) | null = null;

export const setGraphDependencies = (deps: {
  graphRepository?: IGraphRepository | null;
  fetchCategories?: (() => Promise<GraphCategory[]>) | null;
}) => {
  if (deps.graphRepository !== undefined) {
    activeGraphRepository = deps.graphRepository;
  }
  if (deps.fetchCategories !== undefined) {
    activeFetchCategories = deps.fetchCategories;
  }
};

export const getGraphRepository = () => activeGraphRepository;

export interface GraphState {
  // rawGraphData to pełen zbiór pobrany z bazy danych (SQL RPC get_graph)
  rawGraphData: GraphData;
  // data to lokalnie przefiltrowany zbiór wyświetlany przez komponent grafu
  data: GraphData;
  isLoading: boolean;
  error: string | null;
  selectedNode: GraphNode | null;
  filters: GraphFilters;
  categoryColors: Record<string, string>;
  availableCategories: GraphCategory[];

  setFilters: (filters: Partial<GraphFilters>) => void;
  resetFilters: () => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setCategoryColors: (colors: Record<string, string>) => void;
  fetchGraph: (serverFilters?: GraphFilters) => Promise<void>;
  clear: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  rawGraphData: { nodes: [], links: [] },
  data: { nodes: [], links: [] },
  isLoading: false,
  error: null,
  selectedNode: null,
  filters: {},
  categoryColors: {},
  availableCategories: [],

  setFilters: (newFilters) => {
    const updatedFilters = { ...get().filters, ...newFilters };
    const filtered = filterGraphData(get().rawGraphData, updatedFilters);
    set({
      filters: updatedFilters,
      data: filtered,
    });
  },

  resetFilters: () => {
    set({
      filters: {},
      data: get().rawGraphData,
    });
  },

  setSelectedNode: (node) => {
    set({ selectedNode: node });
  },

  setCategoryColors: (colors) => {
    set({ categoryColors: colors });
  },

  fetchGraph: async (serverFilters) => {
    const repository = activeGraphRepository;
    if (!repository) {
      set({ error: 'Repozytorium grafu nie zostało zainicjalizowane', isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const filtersToFetch = serverFilters ?? get().filters;
      const graphData = await repository.getGraph(filtersToFetch);

      // Ekstrakcja wykrytych kategorii z węzłów grafu
      const catMap = new Map<string, GraphCategory>();
      for (const node of graphData.nodes) {
        if (node.categoryId) {
          if (!catMap.has(node.categoryId)) {
            catMap.set(node.categoryId, {
              id: node.categoryId,
              name: node.categoryName || `Kategoria ${catMap.size + 1}`,
              color: node.categoryColor || undefined,
            });
          }
        }
      }

      // Jeśli wstrzyknięto provider kategorii, pobierz również z niego
      if (activeFetchCategories) {
        try {
          const externalCats = await activeFetchCategories();
          for (const cat of externalCats) {
            catMap.set(cat.id, cat);
          }
        } catch {
          // cichy fallback do kategorii wykrytych z węzłów
        }
      }

      const availableCategories = Array.from(catMap.values());
      const catColorMap = { ...get().categoryColors };
      for (const cat of availableCategories) {
        if (cat.color && !catColorMap[cat.id]) {
          catColorMap[cat.id] = cat.color;
        }
      }

      const filtered = filterGraphData(graphData, get().filters);

      set({
        rawGraphData: graphData,
        data: filtered,
        availableCategories,
        categoryColors: catColorMap,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      set({
        error: err?.message || 'Nie udało się pobrać danych grafu',
        isLoading: false,
      });
    }
  },

  clear: () => {
    set({
      rawGraphData: { nodes: [], links: [] },
      data: { nodes: [], links: [] },
      isLoading: false,
      error: null,
      selectedNode: null,
      filters: {},
      availableCategories: [],
    });
  },
}));
