import { IWatchConnectivity, WatchInboxFile } from '../../domain/services/IWatchConnectivity';
import {
  getInboxFiles,
  clearInboxFile,
  addInboxFileListener,
  InboxFileManifest,
} from '../../../modules/watch-connectivity';

function toWatchInboxFile(manifest: InboxFileManifest): WatchInboxFile {
  return {
    id: manifest.id,
    recordedAt: manifest.recordedAt,
    durationMs: manifest.durationMs,
    path: manifest.path,
  };
}

/** Adapter nad modules/watch-connectivity (F4-03) — implementuje IWatchConnectivity. */
export class ExpoWatchConnectivity implements IWatchConnectivity {
  async getInboxFiles(): Promise<WatchInboxFile[]> {
    const manifests = await getInboxFiles();
    return manifests.map(toWatchInboxFile);
  }

  async clearInboxFile(id: string): Promise<void> {
    await clearInboxFile(id);
  }

  subscribeToInboxFiles(listener: (file: WatchInboxFile) => void): () => void {
    const subscription = addInboxFileListener((manifest) => listener(toWatchInboxFile(manifest)));
    return () => subscription.remove();
  }
}
