import { calculateNextAttempt, DEFAULT_BACKOFF_CONFIG } from '../backoff';

describe('Exponential Backoff - calculateNextAttempt', () => {
  const fixedNow = new Date('2026-09-26T10:00:00.000Z');

  it('oblicza bazowy odstęp dla pierwszej nieudanej próby (attempt = 1)', () => {
    const result = calculateNextAttempt(1, fixedNow, DEFAULT_BACKOFF_CONFIG);

    expect(result.isExhausted).toBe(false);
    expect(result.delayMs).toBe(5000); // 5s
    expect(result.nextAttemptAt).toBe(new Date('2026-09-26T10:00:05.000Z').toISOString());
  });

  it('oblicza odstęp wykładniczy dla kolejnych prób (attempt 2, 3, 4)', () => {
    const attempt2 = calculateNextAttempt(2, fixedNow, DEFAULT_BACKOFF_CONFIG);
    expect(attempt2.delayMs).toBe(10000); // 5000 * 2^1 = 10s
    expect(attempt2.nextAttemptAt).toBe(new Date('2026-09-26T10:00:10.000Z').toISOString());

    const attempt3 = calculateNextAttempt(3, fixedNow, DEFAULT_BACKOFF_CONFIG);
    expect(attempt3.delayMs).toBe(20000); // 5000 * 2^2 = 20s
    expect(attempt3.nextAttemptAt).toBe(new Date('2026-09-26T10:00:20.000Z').toISOString());

    const attempt4 = calculateNextAttempt(4, fixedNow, DEFAULT_BACKOFF_CONFIG);
    expect(attempt4.delayMs).toBe(40000); // 5000 * 2^3 = 40s
    expect(attempt4.nextAttemptAt).toBe(new Date('2026-09-26T10:00:40.000Z').toISOString());
  });

  it('zwraca isExhausted: true i nextAttemptAt: null po wyczerpaniu limitu prób (maxAttempts = 5)', () => {
    const result = calculateNextAttempt(5, fixedNow, DEFAULT_BACKOFF_CONFIG);

    expect(result.isExhausted).toBe(true);
    expect(result.nextAttemptAt).toBeNull();
    expect(result.delayMs).toBe(0);

    const overLimit = calculateNextAttempt(6, fixedNow, DEFAULT_BACKOFF_CONFIG);
    expect(overLimit.isExhausted).toBe(true);
    expect(overLimit.nextAttemptAt).toBeNull();
  });

  it('ogranicza maksymalny odstęp do maxDelayMs', () => {
    const customConfig = {
      baseDelayMs: 10000,
      maxDelayMs: 15000,
      maxAttempts: 10,
    };

    // attempt 3: 10000 * 2^2 = 40000 ms, ale maxDelayMs = 15000
    const result = calculateNextAttempt(3, fixedNow, customConfig);
    expect(result.delayMs).toBe(15000);
    expect(result.isExhausted).toBe(false);
  });
});
