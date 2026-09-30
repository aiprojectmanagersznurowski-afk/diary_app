import { IWatchConnectivity, WatchInboxFile } from '../../../domain/services/IWatchConnectivity';
import { IRecordingQueue } from '../../../domain/services/IRecordingQueue';
import { EnqueueRecordingUseCase } from './enqueueRecordingUseCase';

/**
 * Przenosi nagrania odebrane z Apple Watch (docs/02-architektura.md §6.2) z inboksu
 * (modules/watch-connectivity, F4-03) do wspólnej kolejki nagrań (source='watch'), używając tego
 * samego id nadanego na zegarku (F4-02) — gwarancja braku duplikatów, ten sam wzorzec co reszta
 * kolejki (§9).
 */
export class IngestWatchInboxUseCase {
  constructor(
    private watchConnectivity: IWatchConnectivity,
    private recordingQueue: IRecordingQueue,
    private enqueueRecordingUseCase: EnqueueRecordingUseCase,
  ) {}

  async execute(): Promise<void> {
    const files = await this.watchConnectivity.getInboxFiles();
    for (const file of files) {
      await this.ingestOne(file);
    }
  }

  private async ingestOne(file: WatchInboxFile): Promise<void> {
    const existing = await this.recordingQueue.getById(file.id);

    if (!existing) {
      try {
        await this.enqueueRecordingUseCase.execute({
          id: file.id,
          tempUri: file.path,
          durationMs: file.durationMs,
          source: 'watch',
        });
      } catch {
        // id w SqliteRecordingQueue to PRIMARY KEY: ponowny enqueue dla tego samego pliku
        // (np. wyścig między dwoma wywołaniami execute()) rzuca błędem ograniczenia zamiast go
        // po cichu ignorować. Niezależnie od przyczyny błędu, plik i tak trzeba usunąć z inboksu
        // poniżej — nie traktujemy tego jako awarii nagrania.
      }
    }

    await this.watchConnectivity.clearInboxFile(file.id);
  }
}
