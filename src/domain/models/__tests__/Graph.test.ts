import { GraphNode, GraphEdge, GraphData } from '../Graph';

describe('Graph Models', () => {
  it('creates valid graph node and edge objects', () => {
    const node: GraphNode = {
      id: 'node-1',
      kind: 'note',
      noteType: 'idea',
      day: '2026-09-23',
      title: 'Aplikacja do grafu',
      slug: 'aplikacja-do-grafu',
      categoryId: 'cat-1',
      tags: ['ux', 'graf'],
      createdAt: '2026-09-23T10:00:00Z',
    };

    const edge: GraphEdge = {
      source: 'node-1',
      target: 'node-2',
      sourceId: 'node-1',
      targetId: 'node-2',
      kind: 'semantic',
      score: 0.92,
      reason: 'Wspólny temat grafów wiedzy',
    };

    const graph: GraphData = {
      nodes: [node],
      links: [edge],
    };

    expect(graph.nodes).toHaveLength(1);
    expect(graph.links).toHaveLength(1);
    expect(graph.links[0].source).toBe('node-1');
  });
});
