import { IDocumentRepository } from '../../../domain/repositories/IDocumentRepository';
import { DailyDocument } from '../../../domain/models/DailyDocument';

export class GetDailyDocumentsInRangeUseCase {
  constructor(private documentRepository: IDocumentRepository) {}

  async execute(startDay: string, endDay: string): Promise<DailyDocument[]> {
    return await this.documentRepository.getDailyDocumentsInRange(startDay, endDay);
  }
}
