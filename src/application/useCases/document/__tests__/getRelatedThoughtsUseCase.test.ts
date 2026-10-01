import { GetRelatedThoughtsUseCase } from '../getRelatedThoughtsUseCase';
import { IRelatedThoughtsRepository } from '../../../../domain/repositories/IRelatedThoughtsRepository';
import { RelatedThought } from '../../../../domain/models/RelatedThought';

describe('GetRelatedThoughtsUseCase', () => {
  let mockRepository: jest.Mocked<IRelatedThoughtsRepository>;
  let useCase: GetRelatedThoughtsUseCase;

  const mockThoughts: RelatedThought[] = [
    {
      documentId: 'doc-2',
      title: 'Druga myśl',
      kind: 'note',
      noteType: 'idea',
      day: '2026-09-23',
      relationType: 'semantic',
      similarity: 0.89,
    },
  ];

  beforeEach(() => {
    mockRepository = {
      getRelatedThoughts: jest.fn().mockResolvedValue(mockThoughts),
    };
    useCase = new GetRelatedThoughtsUseCase(mockRepository);
  });

  it('calls repository with documentId and limit', async () => {
    const result = await useCase.execute('doc-1', 10);

    expect(mockRepository.getRelatedThoughts).toHaveBeenCalledWith('doc-1', 10);
    expect(result).toEqual(mockThoughts);
  });

  it('uses default limit of 5 when omitted', async () => {
    await useCase.execute('doc-1');
    expect(mockRepository.getRelatedThoughts).toHaveBeenCalledWith('doc-1', 5);
  });

  it('returns empty array without calling repository when documentId is empty', async () => {
    const result = await useCase.execute('');
    expect(result).toEqual([]);
    expect(mockRepository.getRelatedThoughts).not.toHaveBeenCalled();
  });
});
