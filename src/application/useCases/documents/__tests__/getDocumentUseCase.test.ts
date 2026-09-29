import { GetDocumentUseCase } from '../getDocumentUseCase';
import { IDocumentRepository } from '../../../../domain/repositories/IDocumentRepository';
import { DailyDocument } from '../../../../domain/models/DailyDocument';

describe('GetDocumentUseCase', () => {
  it('calls getDocumentById on repository with given id and returns its result', async () => {
    const dailyDoc: DailyDocument = {
      id: 'doc-1',
      userId: 'user-1',
      kind: 'daily',
      day: '2026-09-23',
      bodyMd: '# Test',
      mdPath: 'user-1/daily/2026-09-23.md',
      tags: [],
      dominantThought: 'Test',
      summary: 'Test',
      quotes: [],
      impactOnGoals: '',
      goalImpactType: 'neutral',
      completedTasks: [],
      importantEvents: [],
      emotions: [],
      emotionTriggers: [],
      fatigueLevel: 0,
      stressVsCalm: 'neutral',
      gratefulFor: '',
      goalAdvice: null,
      ideas: [],
      createdAt: '2026-09-23T00:00:00Z',
    };

    const mockRepo: IDocumentRepository = {
      getDocumentById: jest.fn().mockResolvedValue(dailyDoc),
    };

    const useCase = new GetDocumentUseCase(mockRepo);
    const result = await useCase.execute('doc-1');

    expect(mockRepo.getDocumentById).toHaveBeenCalledWith('doc-1');
    expect(mockRepo.getDocumentById).toHaveBeenCalledTimes(1);
    expect(result).toBe(dailyDoc);
  });

  it('returns null when repository finds no document', async () => {
    const mockRepo: IDocumentRepository = {
      getDocumentById: jest.fn().mockResolvedValue(null),
    };

    const useCase = new GetDocumentUseCase(mockRepo);
    const result = await useCase.execute('missing');

    expect(result).toBeNull();
  });
});
