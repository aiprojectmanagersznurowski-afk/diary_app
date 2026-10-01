import { IRelatedThoughtsRepository } from '../../../domain/repositories/IRelatedThoughtsRepository';
import { RelatedThought } from '../../../domain/models/RelatedThought';

export class GetRelatedThoughtsUseCase {
  constructor(private readonly repository: IRelatedThoughtsRepository) {}

  async execute(documentId: string, limit = 5): Promise<RelatedThought[]> {
    if (!documentId) {
      return [];
    }
    return this.repository.getRelatedThoughts(documentId, limit);
  }
}
