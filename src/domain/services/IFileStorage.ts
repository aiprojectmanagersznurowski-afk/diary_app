export interface IFileStorage {
  /**
   * Przenosi plik z tymczasowej lokalizacji (np. z pamięci podręcznej nagrywarki)
   * do trwałego katalogu aplikacji z unikalną nazwą.
   */
  moveToPermanent(tempUri: string, id: string): Promise<string>;

  /**
   * Usuwa plik z pamięci urządzenia.
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Sprawdza, czy plik istnieje pod wskazaną ścieżką.
   */
  fileExists(path: string): Promise<boolean>;
}
