import { SupabaseRelatedThoughtsRepository } from '../supabaseRelatedThoughtsRepository';

describe('SupabaseRelatedThoughtsRepository', () => {
  let mockRpc: jest.Mock;
  let mockClient: any;
  let repository: SupabaseRelatedThoughtsRepository;

  beforeEach(() => {
    mockRpc = jest.fn();
    mockClient = { rpc: mockRpc };
    repository = new SupabaseRelatedThoughtsRepository(mockClient);
  });

  it('calls rpc similar_documents with document_id and k limit', async () => {
    const rawRows = [
      {
        id: 'doc-target-1',
        kind: 'note',
        note_type: 'idea',
        day: '2026-09-22',
        title: 'Podobna myśl',
        slug: 'podobna-mysl',
        category_id: 'cat-1',
        similarity: 0.91,
        relation_type: 'semantic',
        reason: 'Wektorowe podobieństwo treści',
      },
      {
        id: 'doc-target-2',
        kind: 'daily',
        note_type: null,
        day: '2026-09-23',
        title: '2026-09-23',
        slug: '2026-09-23',
        category_id: null,
        similarity: 1.0,
        relation_type: 'day',
        reason: 'Wpis dnia',
      },
    ];

    mockRpc.mockResolvedValue({ data: rawRows, error: null });

    const results = await repository.getRelatedThoughts('doc-source-1', 5);

    expect(mockRpc).toHaveBeenCalledWith('similar_documents', {
      document_id: 'doc-source-1',
      k: 5,
    });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      documentId: 'doc-target-1',
      title: 'Podobna myśl',
      kind: 'note',
      noteType: 'idea',
      day: '2026-09-22',
      slug: 'podobna-mysl',
      categoryId: 'cat-1',
      similarity: 0.91,
      relationType: 'semantic',
      reason: 'Wektorowe podobieństwo treści',
    });
    expect(results[1].relationType).toBe('day');
  });

  it('returns empty array when documentId is empty', async () => {
    const results = await repository.getRelatedThoughts('');
    expect(results).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('throws descriptive error when Supabase RPC returns error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Database connection failed' } });

    await expect(repository.getRelatedThoughts('doc-1')).rejects.toThrow(
      'Błąd pobierania powiązanych myśli: Database connection failed',
    );
  });
});
