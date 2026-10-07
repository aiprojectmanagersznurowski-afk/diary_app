import { describeError, installGlobalErrorHandler } from '../globalErrorHandler';

function fakeErrorUtils() {
  const previous = jest.fn();
  let current: (error: unknown, isFatal?: boolean) => void = previous;
  return {
    previous,
    utils: {
      getGlobalHandler: () => current,
      setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => {
        current = handler;
      },
    },
    trigger: (error: unknown, isFatal?: boolean) => current(error, isFatal),
  };
}

describe('installGlobalErrorHandler', () => {
  it('loguje błąd i przekazuje go do poprzedniego handlera', () => {
    const { utils, previous, trigger } = fakeErrorUtils();
    const log = jest.fn();
    expect(installGlobalErrorHandler(utils, log)).toBe(true);

    const error = new TypeError('coś się zepsuło');
    trigger(error, false);

    expect(log).toHaveBeenCalledWith('[GlobalError] TypeError: coś się zepsuło');
    expect(previous).toHaveBeenCalledWith(error, false);
  });

  it('oznacza błędy krytyczne', () => {
    const { utils, previous, trigger } = fakeErrorUtils();
    const log = jest.fn();
    installGlobalErrorHandler(utils, log);
    trigger(new Error('crash'), true);
    expect(log).toHaveBeenCalledWith('[GlobalError fatal] Error: crash');
    expect(previous).toHaveBeenCalledTimes(1);
  });

  it('zwraca false, gdy ErrorUtils nie istnieje (np. środowisko testowe/web)', () => {
    expect(installGlobalErrorHandler(null, jest.fn())).toBe(false);
  });
});

describe('describeError', () => {
  it('nie loguje śladu stosu i skraca długie komunikaty', () => {
    const error = new Error('x'.repeat(500));
    const text = describeError(error);
    expect(text).not.toContain('at ');
    expect(text.length).toBeLessThan(230);
  });

  it('obsługuje wartości, które nie są błędami', () => {
    expect(describeError('tekst')).toBe('Nieznany błąd: tekst');
    expect(describeError(undefined)).toBe('Nieznany błąd: undefined');
  });
});
