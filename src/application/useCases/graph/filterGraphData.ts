import { GraphData, GraphFilters, GraphNode, GraphEdge } from '../../../domain/models/Graph';

/**
 * Filtruje strukturę grafu lokalnie na podstawie zadanych kryteriów (zakres dat, kategorie, typy notatek, min_score).
 * Zgodnie z docs/02-architektura.md §6.5:
 * - Wpisy dnia (kind = 'daily') zachowują status węzłów centralnych i podlegają filtrowaniu dat.
 * - Notatki podlegają filtrowaniu dat, kategorii i typów notatek.
 * - Krawędzie łączą wyłącznie istniejące węzły i podlegają filtrowaniu progu minScore (powiązania semantyczne).
 */
export function filterGraphData(data: GraphData, filters: GraphFilters): GraphData {
  if (!data || !data.nodes) {
    return { nodes: [], links: [] };
  }

  const { dateFrom, dateTo, categoryIds, noteTypes, minScore } = filters;

  const hasCategoryFilter = Boolean(categoryIds && categoryIds.length > 0);
  const hasNoteTypeFilter = Boolean(noteTypes && noteTypes.length > 0);

  // 1. Filtrowanie węzłów
  const filteredNodes = data.nodes.filter((node: GraphNode) => {
    if (dateFrom && node.day < dateFrom) {
      return false;
    }
    if (dateTo && node.day > dateTo) {
      return false;
    }

    if (node.kind === 'daily') {
      return true;
    }

    if (hasCategoryFilter) {
      if (!node.categoryId || !categoryIds!.includes(node.categoryId)) {
        return false;
      }
    }

    if (hasNoteTypeFilter) {
      if (!node.noteType || !noteTypes!.includes(node.noteType)) {
        return false;
      }
    }

    return true;
  });

  const validNodeIds = new Set(filteredNodes.map((n) => n.id));

  // 2. Filtrowanie krawędzi
  const filteredLinks = (data.links || []).filter((link: GraphEdge) => {
    const sourceId =
      typeof link.source === 'object' && link.source !== null ? (link.source as any).id : link.sourceId || link.source;
    const targetId =
      typeof link.target === 'object' && link.target !== null ? (link.target as any).id : link.targetId || link.target;

    if (!validNodeIds.has(sourceId) || !validNodeIds.has(targetId)) {
      return false;
    }

    if (minScore != null && link.score != null && link.score < minScore) {
      return false;
    }

    return true;
  });

  return {
    nodes: filteredNodes,
    links: filteredLinks,
  };
}
