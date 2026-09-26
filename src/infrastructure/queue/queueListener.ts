import { AppState, AppStateStatus } from 'react-native';
import { ProcessRecordingQueueUseCase } from '../../application/useCases/recording/processRecordingQueueUseCase';

/**
 * Rejestruje wyzwalacze dla automatycznego ponawiania i przetwarzania kolejki nagrań:
 * 1. Start aplikacji (natychmiastowe przetworzenie).
 * 2. Powrót aplikacji na pierwszy plan (AppState: 'active').
 * 3. Okresowe sprawdzanie kolejki w tle co określony interwał (np. 60 sekund).
 */
export function setupQueueListener(
  processQueueUseCase: ProcessRecordingQueueUseCase,
  options: { intervalMs?: number } = {},
): () => void {
  const intervalMs = options.intervalMs ?? 60000;

  // 1. Start aplikacji: uruchamiamy od razu
  processQueueUseCase.processPending().catch(() => {});

  // 2. Powrót na pierwszy plan
  const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      processQueueUseCase.processPending().catch(() => {});
    }
  });

  // 3. Okresowy sprawdzacz (np. gdy sieć wróciła w trakcie działania aplikacji)
  const timer = setInterval(() => {
    if (AppState.currentState === 'active') {
      processQueueUseCase.processPending().catch(() => {});
    }
  }, intervalMs);

  return () => {
    subscription.remove();
    clearInterval(timer);
  };
}
