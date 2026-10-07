/**
 * Globalny handler błędów JS: loguje błąd (sama nazwa i skrócony komunikat, bez śladu stosu i bez treści
 * notatek) i przekazuje go dalej do domyślnego handlera React Native (czerwony ekran w dev, zakończenie
 * aplikacji przy błędzie krytycznym w wersji produkcyjnej).
 */

interface ErrorUtilsLike {
  getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
}

const MAX_MESSAGE = 200;

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message.slice(0, MAX_MESSAGE)}`;
  }
  return `Nieznany błąd: ${String(error).slice(0, MAX_MESSAGE)}`;
}

export function installGlobalErrorHandler(
  errorUtils: ErrorUtilsLike | null = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils ?? null,
  log: (message: string) => void = (message) => console.error(message),
): boolean {
  if (!errorUtils) return false;
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    log(`[GlobalError${isFatal ? ' fatal' : ''}] ${describeError(error)}`);
    previous(error, isFatal);
  });
  return true;
}

interface HermesLike {
  enablePromiseRejectionTracker?: (options: {
    allRejections: boolean;
    onUnhandled: (id: number, error: unknown) => void;
    onHandled?: (id: number) => void;
  }) => void;
}

/**
 * Nieobsłużone odrzucenia obietnic: React Native śledzi je tylko w trybie dev, a w buildzie produkcyjnym
 * przepadają bez śladu. Włączamy śledzenie Hermesa i logujemy takie odrzucenia (nie kończą aplikacji).
 */
export function installUnhandledRejectionTracker(
  hermes: HermesLike | null = (globalThis as { HermesInternal?: HermesLike }).HermesInternal ?? null,
  log: (message: string) => void = (message) => console.error(message),
): boolean {
  if (!hermes?.enablePromiseRejectionTracker) return false;
  hermes.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (_id, error) => log(`[UnhandledRejection] ${describeError(error)}`),
  });
  return true;
}
