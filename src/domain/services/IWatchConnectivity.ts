export interface WatchInboxFile {
  /** UUID nadany na zegarku (F4-02) — ten sam id trafia potem do kolejki nagrań na telefonie. */
  id: string;
  /** ISO 8601. */
  recordedAt: string;
  durationMs: number;
  /** Ścieżka absolutna do pliku audio odebranego od zegarka. */
  path: string;
}

/**
 * Odczyt plików odebranych od Apple Watch (docs/02-architektura.md §6.2), za pośrednictwem
 * modułu natywnego modules/watch-connectivity (F4-03). Nie importuje modułu bezpośrednio —
 * `domain` jest bez bibliotek; adapter w infrastructure/watch/** implementuje ten interfejs.
 */
export interface IWatchConnectivity {
  getInboxFiles(): Promise<WatchInboxFile[]>;
  clearInboxFile(id: string): Promise<void>;
  /** Zwraca funkcję anulującą subskrypcję. */
  subscribeToInboxFiles(listener: (file: WatchInboxFile) => void): () => void;
  /**
   * Wysyła status nagrania na zegarek (F4-05: WCSession.updateApplicationContext po stronie
   * natywnej). Wołane tylko dla nagrań źródła 'watch' — nagrania z telefonu nie mają po co
   * trafiać z powrotem na zegarek.
   */
  sendRecordingStatus(id: string, status: string): Promise<void>;
}
