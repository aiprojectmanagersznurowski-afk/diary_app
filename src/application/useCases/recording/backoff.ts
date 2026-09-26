export interface BackoffConfig {
  baseDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
}

export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  baseDelayMs: 5000, // 5 sekund
  maxDelayMs: 300000, // 5 minut
  maxAttempts: 5,
};

/**
 * Oblicza czas następnej próby według algorytmu odstępu wykładniczego:
 * delay = min(baseDelayMs * 2^(attempts - 1), maxDelayMs).
 * Gdy liczba prób osiąga limit (maxAttempts), zwraca null i isExhausted: true.
 */
export function calculateNextAttempt(
  attempts: number,
  now: Date = new Date(),
  config: BackoffConfig = DEFAULT_BACKOFF_CONFIG,
): { nextAttemptAt: string | null; isExhausted: boolean; delayMs: number } {
  if (attempts >= config.maxAttempts) {
    return { nextAttemptAt: null, isExhausted: true, delayMs: 0 };
  }

  const exponent = Math.max(0, attempts - 1);
  const delayMs = Math.min(config.baseDelayMs * Math.pow(2, exponent), config.maxDelayMs);
  const nextDate = new Date(now.getTime() + delayMs);

  return {
    nextAttemptAt: nextDate.toISOString(),
    isExhausted: false,
    delayMs,
  };
}
