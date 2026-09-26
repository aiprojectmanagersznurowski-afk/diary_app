import { QueuedRecording, NewQueuedRecording } from '../models/QueuedRecording';

export interface IRecordingQueue {
  /**
   * Dodaje nowe nagranie do kolejki ze statusem 'pending'.
   */
  enqueue(recording: NewQueuedRecording): Promise<QueuedRecording>;

  /**
   * Zwraca nagrania oczekujące na wysłanie (status = 'pending' i nextAttemptAt <= now).
   */
  getPending(now?: Date): Promise<QueuedRecording[]>;

  /**
   * Zwraca nagranie po identyfikatorze.
   */
  getById(id: string): Promise<QueuedRecording | null>;

  /**
   * Zwraca wszystkie wpisy z kolejki (do podglądu / diagnostyki).
   */
  getAll(): Promise<QueuedRecording[]>;

  /**
   * Oznacza nagranie jako w trakcie wysyłki.
   */
  markUploading(id: string): Promise<void>;

  /**
   * Oznacza nagranie jako pomyślnie wysłane.
   */
  markSuccess(id: string): Promise<void>;

  /**
   * Oznacza próbę wysyłki nagrania jako nieudaną, zwiększa licznik prób i ustawia czas kolejnej próby.
   */
  markFailed(id: string, error: string, nextAttemptAt: string | null, attempts: number): Promise<void>;

  /**
   * Usuwa nagranie z kolejki po potwierdzeniu zapisu na serwerze.
   */
  remove(id: string): Promise<void>;
}
