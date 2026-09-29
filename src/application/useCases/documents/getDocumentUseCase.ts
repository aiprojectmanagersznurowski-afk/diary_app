import { IDocumentRepository, AnyDocument } from '../../../domain/repositories/IDocumentRepository';

export class GetDocumentUseCase {
  constructor(private documentRepository: IDocumentRepository) {}

  async execute(id: string): Promise<AnyDocument | null> {
    return await this.documentRepository.getDocumentById(id);
  }
}
