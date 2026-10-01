import { SupabaseGraphRepository } from '../supabaseGraphRepository';

describe('SupabaseGraphRepository', () => {
  let mockRpc: jest.Mock;
  let mockClient: any;
  let repository: SupabaseGraphRepository;

  beforeEach(() => {
    mockRpc = jest.fn();
    mockClient = { rpc: mockRpc };
    repository = new SupabaseGraphRepository(mockClient);
  });

  it('calls rpc get_graph with mapped parameters and returns domain graph data', async () => {
    const rawData = {
      nodes: [
        {
          id: 'doc-1',
          kind: 'note',
          note_type: 'idea',
          day: '2026-09-23',
          title: 'Notatka A',
          slug: 'notatka-a',
          category_id: 'cat-1',
          tags: ['pomysl'],
          created_at: '2026-09-23T10:00:00Z',
        },
      ],
      links: [
        {
          source: 'doc-1',
          target: 'doc-2',
          source_id: 'doc-1',
          target_id: 'doc-2',
          kind: 'semantic',
          score: 0.88,
          reason: 'Podobieństwo tematyczne',
        },
      ],
    };

    mockRpc.mockResolvedValue({ data: rawData, error: null });

    const result = await repository.getGraph({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      categoryIds: ['cat-1'],
      noteTypes: ['idea'],
      minScore: 0.7,
    });

    expect(mockRpc).toHaveBeenCalledWith('get_graph', {
      date_from: '2026-09-01',
      date_to: '2026-09-30',
      category_ids: ['cat-1'],
      note_types: ['idea'],
      min_score: 0.7,
    });

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toEqual({
      id: 'doc-1',
      kind: 'note',
      noteType: 'idea',
      day: '2026-09-23',
      title: 'Notatka A',
      slug: 'notatka-a',
      categoryId: 'cat-1',
      tags: ['pomysl'],
      createdAt: '2026-09-23T10:00:00Z',
    });

    expect(result.links).toHaveLength(1);
    expect(result.links[0]).toEqual({
      source: 'doc-1',
      target: 'doc-2',
      sourceId: 'doc-1',
      targetId: 'doc-2',
      kind: 'semantic',
      score: 0.88,
      reason: 'Podobieństwo tematyczne',
    });
  });

  it('throws an error if rpc returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Database connection error' } });

    await expect(repository.getGraph()).rejects.toThrow('Błąd pobierania grafu: Database connection error');
  });

  it('handles empty results gracefully', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await repository.getGraph();
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });
});
