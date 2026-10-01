import { filterGraphData } from '../filterGraphData';
import { GraphData, GraphNode, GraphEdge } from '../../../../domain/models/Graph';

describe('filterGraphData', () => {
  const dailyNode: GraphNode = {
    id: 'daily-2026-09-23',
    kind: 'daily',
    day: '2026-09-23',
    title: '2026-09-23',
    slug: '2026-09-23',
    tags: [],
    createdAt: '2026-09-23T00:00:00Z',
  };

  const ideaNode: GraphNode = {
    id: 'note-idea',
    kind: 'note',
    noteType: 'idea',
    day: '2026-09-23',
    title: 'Świetny pomysł',
    slug: 'swietny-pomysl',
    categoryId: 'cat-work',
    tags: ['work'],
    createdAt: '2026-09-23T10:00:00Z',
  };

  const taskNode: GraphNode = {
    id: 'note-task',
    kind: 'note',
    noteType: 'task',
    day: '2026-09-20',
    title: 'Zadanie domowe',
    slug: 'zadanie-domowe',
    categoryId: 'cat-home',
    tags: ['home'],
    createdAt: '2026-09-20T12:00:00Z',
  };

  const reflectionNode: GraphNode = {
    id: 'note-reflection',
    kind: 'note',
    noteType: 'reflection',
    day: '2026-09-25',
    title: 'Refleksja wieczorna',
    slug: 'refleksja-wieczorna',
    categoryId: 'cat-personal',
    tags: ['mind'],
    createdAt: '2026-09-25T20:00:00Z',
  };

  const dayLink: GraphEdge = {
    source: 'daily-2026-09-23',
    target: 'note-idea',
    sourceId: 'daily-2026-09-23',
    targetId: 'note-idea',
    kind: 'day',
  };

  const semanticLinkHigh: GraphEdge = {
    source: 'note-idea',
    target: 'note-task',
    sourceId: 'note-idea',
    targetId: 'note-task',
    kind: 'semantic',
    score: 0.85,
  };

  const semanticLinkLow: GraphEdge = {
    source: 'note-idea',
    target: 'note-reflection',
    sourceId: 'note-idea',
    targetId: 'note-reflection',
    kind: 'semantic',
    score: 0.45,
  };

  const sampleGraph: GraphData = {
    nodes: [dailyNode, ideaNode, taskNode, reflectionNode],
    links: [dayLink, semanticLinkHigh, semanticLinkLow],
  };

  it('returns all nodes and links when filters are empty', () => {
    const result = filterGraphData(sampleGraph, {});
    expect(result.nodes).toHaveLength(4);
    expect(result.links).toHaveLength(3);
  });

  it('filters by date range', () => {
    const result = filterGraphData(sampleGraph, {
      dateFrom: '2026-09-22',
      dateTo: '2026-09-24',
    });

    // 2026-09-20 (task) is excluded, 2026-09-25 (reflection) is excluded
    expect(result.nodes.map((n) => n.id)).toEqual(['daily-2026-09-23', 'note-idea']);
    // Only dayLink connects the surviving nodes
    expect(result.links).toHaveLength(1);
    expect(result.links[0].sourceId).toBe('daily-2026-09-23');
  });

  it('filters by categoryIds while preserving daily central hubs', () => {
    const result = filterGraphData(sampleGraph, {
      categoryIds: ['cat-work'],
    });

    // dailyNode is preserved as central hub, ideaNode matches cat-work
    expect(result.nodes.map((n) => n.id)).toEqual(['daily-2026-09-23', 'note-idea']);
    expect(result.links).toHaveLength(1);
  });

  it('filters by noteTypes while preserving daily central hubs', () => {
    const result = filterGraphData(sampleGraph, {
      noteTypes: ['task'],
    });

    // dailyNode preserved, only taskNode matches
    expect(result.nodes.map((n) => n.id)).toEqual(['daily-2026-09-23', 'note-task']);
    // Since note-idea is excluded, links connecting note-idea to note-task or daily are removed
    expect(result.links).toHaveLength(0);
  });

  it('filters links by minScore', () => {
    const result = filterGraphData(sampleGraph, {
      minScore: 0.6,
    });

    // All nodes preserved
    expect(result.nodes).toHaveLength(4);
    // semanticLinkLow (score 0.45) is excluded; dayLink (score null) and semanticLinkHigh (0.85) are kept
    expect(result.links).toHaveLength(2);
    expect(result.links.map((l) => l.kind)).toEqual(['day', 'semantic']);
  });

  it('handles objects for source and target in links (react-force-graph mutated format)', () => {
    const mutatedGraph: GraphData = {
      nodes: [dailyNode, ideaNode],
      links: [
        {
          source: { id: 'daily-2026-09-23' } as any,
          target: { id: 'note-idea' } as any,
          sourceId: 'daily-2026-09-23',
          targetId: 'note-idea',
          kind: 'day',
        },
      ],
    };

    const result = filterGraphData(mutatedGraph, {});
    expect(result.links).toHaveLength(1);
  });
});
