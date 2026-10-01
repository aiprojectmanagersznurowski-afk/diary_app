import { GraphData, GraphFilters } from '../models/Graph';

export interface IGraphRepository {
  /**
   * Pobiera węzły i krawędzie grafu wiedzy zalogowanego użytkownika,
   * opcjonalnie z uwzględnieniem filtrów.
   */
  getGraph(filters?: GraphFilters): Promise<GraphData>;
}
