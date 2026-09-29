import { requireOptionalNativeModule, NativeModule, EventSubscription } from 'expo-modules-core';

export interface InboxFileManifest {
  /** Client-generated UUID nadany na zegarku (F4-02) — klucz idempotencji przez cały pipeline. */
  id: string;
  /** ISO 8601. */
  recordedAt: string;
  durationMs: number;
  /** Ścieżka absolutna do pliku .m4a w Documents/watch-inbox/ na iPhonie. */
  path: string;
}

type WatchConnectivityEvents = {
  onInboxFileReceived: (event: InboxFileManifest) => void;
};

declare class WatchConnectivityNativeModule extends NativeModule<WatchConnectivityEvents> {
  getInboxFiles(): Promise<InboxFileManifest[]>;
  clearInboxFile(id: string): Promise<void>;
  sendRecordingStatus(id: string, status: string): Promise<void>;
}

// Moduł iOS-only (zegarek Apple Watch); na Androidzie/webie requireOptionalNativeModule zwraca
// null zamiast rzucać błędem przy imporcie, więc reszta pliku musi się na to zabezpieczyć.
const nativeModule = requireOptionalNativeModule<WatchConnectivityNativeModule>('WatchConnectivity');

/** Czy moduł jest dostępny na tej platformie (tylko iOS, patrz expo-module.config.json). */
export function isWatchConnectivityAvailable(): boolean {
  return nativeModule !== null;
}

/**
 * Subskrybuje zdarzenie nowego pliku w inboksie (docs/02-architektura.md §6.2, krok 3).
 * Zwraca no-op subscription, jeśli moduł jest niedostępny na tej platformie.
 */
export function addInboxFileListener(listener: (event: InboxFileManifest) => void): EventSubscription {
  if (!nativeModule) {
    return { remove: () => {} };
  }
  return nativeModule.addListener('onInboxFileReceived', listener);
}

export async function getInboxFiles(): Promise<InboxFileManifest[]> {
  if (!nativeModule) return [];
  return await nativeModule.getInboxFiles();
}

export async function clearInboxFile(id: string): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.clearInboxFile(id);
}

/**
 * Wysyła status nagrania na zegarek (WCSession.updateApplicationContext po stronie natywnej).
 * Sygnatura zarezerwowana w F4-03; implementacja natywna to F4-05, wywołanie z aplikacji to F4-06.
 */
export async function sendRecordingStatus(id: string, status: string): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.sendRecordingStatus(id, status);
}
