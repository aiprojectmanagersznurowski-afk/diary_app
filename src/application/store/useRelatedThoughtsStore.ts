import { create } from 'zustand';
import { RelatedThought } from '../../domain/models/RelatedThought';
import { IRelatedThoughtsRepository } from '../../domain/repositories/IRelatedThoughtsRepository';

let activeRelatedThoughtsRepository: IRelatedThoughtsRepository | null = null;

export const setRelatedThoughtsDependencies = (deps: {
  relatedThoughtsRepository?: IRelatedThoughtsRepository | null;
}) => {
  if (deps.relatedThoughtsRepository !== undefined) {
    activeRelatedThoughtsRepository = deps.relatedThoughtsRepository;
  }
};

export const getRelatedThoughtsRepository = () => activeRelatedThoughtsRepository;

export interface RelatedThoughtsState {
  items: RelatedThought[];
  isLoading: boolean;
  error: string | null;
  currentDocumentId: string | null;

  loadRelatedThoughts: (documentId: string, limit?: number) => Promise<void>;
  clear: () => void;
}

export const useRelatedThoughtsStore = create<RelatedThoughtsState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  currentDocumentId: null,

  loadRelatedThoughts: async (documentId: string, limit = 5) => {
    if (!documentId) {
      set({ items: [], isLoading: false, error: null, currentDocumentId: null });
      return;
    }

    const repo = activeRelatedThoughtsRepository;
    if (!repo) {
      set({
        error: 'Repozytorium powiązanych myśli nie zostało zainicjalizowane',
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true, error: null, currentDocumentId: documentId });

    try {
      const results = await repo.getRelatedThoughts(documentId, limit);
      if (get().currentDocumentId === documentId) {
        set({ items: results, isLoading: false, error: null });
      }
    } catch (err: any) {
      if (get().currentDocumentId === documentId) {
        set({
          error: err?.message || 'Nie udało się pobrać powiązanych myśli',
          isLoading: false,
        });
      }
    }
  },

  clear: () => {
    set({ items: [], isLoading: false, error: null, currentDocumentId: null });
  },
}));
