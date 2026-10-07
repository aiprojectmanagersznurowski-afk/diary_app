const REF = 'abcdefghijklmnopqrst';
const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const anonKey = `${b64url({ alg: 'HS256' })}.${b64url({ role: 'anon', ref: REF })}.c2ln`;

const VALID = {
  EXPO_PUBLIC_SUPABASE_URL: `https://${REF}.supabase.co`,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '123456789012-webclientid.apps.googleusercontent.com',
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '123456789012-iosclientid.apps.googleusercontent.com',
};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(null),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
  },
}));

const names = Object.keys(VALID);
const saved: Record<string, string | undefined> = {};

function loadClientModule(env: Record<string, string | undefined>) {
  for (const name of names) {
    if (env[name] === undefined) delete process.env[name];
    else process.env[name] = env[name];
  }
  let mod: typeof import('../../supabase/supabaseClient') | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('../../supabase/supabaseClient');
  });
  return mod as typeof import('../../supabase/supabaseClient');
}

beforeEach(() => {
  for (const name of names) saved[name] = process.env[name];
});

afterEach(() => {
  for (const name of names) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

describe('supabaseClient przy błędnej konfiguracji', () => {
  it('nie tworzy klienta: wynik walidacji ma błędy, a użycie klienta rzuca czytelny ConfigError', () => {
    const { supabase, appConfigResult } = loadClientModule({
      ...VALID,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: '<anon key z .env>',
    });
    expect(appConfigResult.config).toBeNull();
    expect(appConfigResult.issues.map((i) => i.variable)).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(() => supabase.auth).toThrow(/Błędna konfiguracja aplikacji/);
    expect(() => supabase.from('documents')).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('nie rzuca przy sprawdzaniu `then` i symboli (await, serializacja)', () => {
    const { supabase } = loadClientModule({});
    expect((supabase as unknown as { then?: unknown }).then).toBeUndefined();
    expect(() => String(Symbol.iterator in (supabase as object))).not.toThrow();
  });

  it('brak wszystkich zmiennych daje cztery błędy i brak konfiguracji', () => {
    const { appConfigResult } = loadClientModule({});
    expect(appConfigResult.config).toBeNull();
    expect(appConfigResult.issues).toHaveLength(4);
  });
});

describe('supabaseClient przy poprawnej konfiguracji', () => {
  it('tworzy prawdziwego klienta z adresem i kluczem z konfiguracji', () => {
    const { supabase, appConfigResult } = loadClientModule(VALID);
    expect(appConfigResult.issues).toEqual([]);
    expect(appConfigResult.config?.supabaseUrl).toBe(`https://${REF}.supabase.co`);
    expect(typeof supabase.auth.signInWithIdToken).toBe('function');
    expect((supabase as unknown as { supabaseUrl: string }).supabaseUrl).toBe(`https://${REF}.supabase.co`);
  });
});
