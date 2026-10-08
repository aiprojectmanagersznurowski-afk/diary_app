import { DilemmaAdvisory } from '../models/DilemmaAdvisory';

export interface IDilemmaAdvisoryRepository {
  getAdvisory(documentId: string): Promise<DilemmaAdvisory | null>;
  requestAdvisory(documentId: string, members?: string[]): Promise<DilemmaAdvisory>;
  saveUserDecision(documentId: string, decision: string): Promise<void>;
}
