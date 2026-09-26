import { fetchWithRetry } from './retry.ts';

Deno.test('fetchWithRetry - zwraca odpowiedź przy sukcesie za pierwszym razem', async () => {
  let callCount = 0;
  const mockFetch = async () => {
    callCount++;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const response = await fetchWithRetry('https://example.com/api', {}, { fetchFn: mockFetch });
  if (!response.ok) {
    throw new Error('Oczekiwano odpowiedzi sukcesu');
  }
  if (callCount !== 1) {
    throw new Error(`Oczekiwano 1 wywołania, otrzymano ${callCount}`);
  }
});

Deno.test('fetchWithRetry - ponawia żądanie przy kodzie 429 i kończy sukcesem', async () => {
  let callCount = 0;
  const sleptMs: number[] = [];

  const mockFetch = async () => {
    callCount++;
    if (callCount === 1) {
      return new Response('Rate limit', {
        status: 429,
        headers: { 'retry-after': '1' },
      });
    }
    return new Response(JSON.stringify({ text: 'success' }), { status: 200 });
  };

  const sleeper = async (ms: number) => {
    sleptMs.push(ms);
  };

  const response = await fetchWithRetry(
    'https://example.com/api',
    {},
    {
      fetchFn: mockFetch,
      sleeper,
      maxRetries: 3,
    },
  );

  if (!response.ok) {
    throw new Error('Oczekiwano sukcesu po ponowieniu');
  }
  if (callCount !== 2) {
    throw new Error(`Oczekiwano 2 wywołań, otrzymano ${callCount}`);
  }
  if (sleptMs[0] !== 1000) {
    throw new Error(`Oczekiwano opóźnienia 1000ms z nagłówka retry-after, otrzymano ${sleptMs[0]}`);
  }
});

Deno.test('fetchWithRetry - ponawia żądanie przy kodzie 503 z wykładniczym odstępem', async () => {
  let callCount = 0;
  const sleptMs: number[] = [];

  const mockFetch = async () => {
    callCount++;
    if (callCount < 3) {
      return new Response('Server Error', { status: 503 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const sleeper = async (ms: number) => {
    sleptMs.push(ms);
  };

  const response = await fetchWithRetry(
    'https://example.com/api',
    {},
    {
      fetchFn: mockFetch,
      sleeper,
      baseDelayMs: 100,
      maxRetries: 3,
    },
  );

  if (!response.ok) {
    throw new Error('Oczekiwano sukcesu po 2 błędach 503');
  }
  if (callCount !== 3) {
    throw new Error(`Oczekiwano 3 wywołań, otrzymano ${callCount}`);
  }
  if (sleptMs[0] !== 100 || sleptMs[1] !== 200) {
    throw new Error(`Oczekiwano odstępów 100ms i 200ms, otrzymano: ${sleptMs.join(', ')}`);
  }
});

Deno.test('fetchWithRetry - rzuca błąd po przekroczeniu limitu prób', async () => {
  let callCount = 0;
  const mockFetch = async () => {
    callCount++;
    return new Response('Service Unavailable', { status: 503 });
  };

  const sleeper = async () => {};

  const response = await fetchWithRetry(
    'https://example.com/api',
    {},
    {
      fetchFn: mockFetch,
      sleeper,
      maxRetries: 2,
    },
  );

  if (response.status !== 503) {
    throw new Error(`Oczekiwano statusu 503 po wyczerpaniu prób, otrzymano ${response.status}`);
  }
  if (callCount !== 3) {
    throw new Error(`Oczekiwano 3 prób (1 początkowa + 2 ponowienia), otrzymano ${callCount}`);
  }
});
