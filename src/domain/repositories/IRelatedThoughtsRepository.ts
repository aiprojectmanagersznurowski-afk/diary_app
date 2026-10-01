import { RelatedThought } from '../models/RelatedThought';

export interface IRelatedThoughtsRepository {
  /**
   * Pobiera powiązane myśli (relacje z tabeli links oraz podobieństwo semantyczne)
   * dla danego dokumentu za pomocą RPC similar_documents.
   */
  getRelatedThoughts(documentId: string, limit?: number): Promise<RelatedThought[]>;
}
