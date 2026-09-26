export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  fetchFn?: FetchFn;
  sleeper?: (ms: number) => Promise<void>;
}

const defaultSleeper = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Wykonuje żądanie HTTP z automatycznym ponawianiem przy kodach 429 (Rate Limit) i 5xx (błędy serwera).
 * Uwzględnia nagłówek Retry-After, jeśli jest obecny.
 */
export async function fetchWithRetry(
  url: string | URL,
  init: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;
  const customFetch = options.fetchFn ?? fetch;
  const sleep = options.sleeper ?? defaultSleeper;

  let lastResponse: Response | null = null;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await customFetch(url, init);

      // Kody sukcesu i błędy klienta (inne niż 429) nie podlegają ponawianiu
      if (response.ok || (response.status < 500 && response.status !== 429)) {
        return response;
      }

      lastResponse = response;

      // Jeśli to ostatnia próba, nie czekamy
      if (attempt === maxRetries) {
        break;
      }

      // Sprawdzamy nagłówek Retry-After
      const retryAfterHeader = response.headers?.get('retry-after');
      let delayMs = baseDelayMs * Math.pow(2, attempt);

      if (retryAfterHeader) {
        const seconds = parseInt(retryAfterHeader, 10);
        if (!isNaN(seconds) && seconds > 0) {
          delayMs = seconds * 1000;
        }
      }

      await sleep(delayMs);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxRetries) {
        throw lastError;
      }
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      await sleep(delayMs);
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError ?? new Error('Błąd żądania sieciowego po wyczerpaniu prób');
}
