/* global describe, it, expect, Buffer */
const { validateEnv, formatIssues, isPlaceholder, maskValue, reversedClientIdScheme, VARS } = require('../validateEnv');

const REF = 'abcdefghijklmnopqrst';
const NOW = 1_800_000_000;
const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (payload) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.c2lnbmF0dXJl`;

const IOS_ID = '123456789012-iosclientid.apps.googleusercontent.com';
const validEnv = () => ({
  [VARS.supabaseUrl]: `https://${REF}.supabase.co`,
  [VARS.supabaseAnonKey]: jwt({ role: 'anon', ref: REF, exp: NOW + 10_000 }),
  [VARS.googleWebClientId]: '123456789012-webclientid.apps.googleusercontent.com',
  [VARS.googleIosClientId]: IOS_ID,
});

const run = (env, options = {}) => validateEnv(env, { nowSeconds: NOW, ...options });
const variables = (env, options) => run(env, options).issues.map((i) => i.variable);

describe('validateEnv: poprawna konfiguracja', () => {
  it('akceptuje poprawny komplet', () => {
    expect(run(validEnv())).toEqual({ issues: [], warnings: [] });
  });

  it('akceptuje klucz sb_publishable_ i adres z ukośnikiem', () => {
    const env = {
      ...validEnv(),
      [VARS.supabaseAnonKey]: 'sb_publishable_AbCdEf123456',
      [VARS.supabaseUrl]: `https://${REF}.supabase.co/`,
    };
    expect(run(env).issues).toEqual([]);
  });
});

describe('validateEnv: braki i teksty zastępcze', () => {
  it.each(Object.values(VARS))('odrzuca brak zmiennej %s', (variable) => {
    const env = validEnv();
    delete env[variable];
    const { issues } = run(env);
    expect(issues.map((i) => i.variable)).toContain(variable);
    expect(issues.find((i) => i.variable === variable).message).toContain('brak wartości');
  });

  it('odrzuca puste wartości i same spacje', () => {
    expect(variables({ ...validEnv(), [VARS.supabaseAnonKey]: '' })).toContain(VARS.supabaseAnonKey);
    expect(variables({ ...validEnv(), [VARS.supabaseAnonKey]: '   ' })).toContain(VARS.supabaseAnonKey);
  });

  it.each(['<anon key z .env>', '<z .env>', 'placeholder-anon-key', 'your-key-here', 'undefined', 'null', 'changeme'])(
    'rozpoznaje tekst zastępczy: %s',
    (value) => {
      expect(isPlaceholder(value)).toBe(true);
      const { issues } = run({ ...validEnv(), [VARS.supabaseAnonKey]: value });
      expect(issues.find((i) => i.variable === VARS.supabaseAnonKey).message).toContain('tekst zastępczy');
    },
  );

  it('incydent: trzy zmienne EAS z tekstami zastępczymi odrzucone naraz', () => {
    const env = {
      ...validEnv(),
      [VARS.supabaseAnonKey]: '<anon key z .env>',
      [VARS.googleWebClientId]: '<z .env>',
      [VARS.googleIosClientId]: '<z .env>',
    };
    expect(variables(env).sort()).toEqual(
      [VARS.googleIosClientId, VARS.googleWebClientId, VARS.supabaseAnonKey].sort(),
    );
  });
});

describe('validateEnv: adres i klucz Supabase', () => {
  it.each([
    'http://abcdefghijklmnopqrst.supabase.co',
    'https://short.supabase.co',
    'https://abcdefghijklmnopqrst.supabase.com',
    'https://abcdefghijklmnopqrst.supabase.co/rest/v1',
    'https://localhost:54321',
  ])('odrzuca adres %s', (url) => {
    expect(variables({ ...validEnv(), [VARS.supabaseUrl]: url })).toContain(VARS.supabaseUrl);
  });

  const withKey = (key) => ({ ...validEnv(), [VARS.supabaseAnonKey]: key });

  it('odrzuca ciąg niebędący JWT', () => {
    expect(run(withKey('to-nie-jest-jwt')).issues[0].message).toContain('nie jest klucz JWT');
  });

  it('odrzuca rolę inną niż anon (w tym uprzywilejowaną) i brak roli', () => {
    expect(run(withKey(jwt({ role: 'admin', ref: REF }))).issues[0].message).toContain('admin');
    expect(run(withKey(jwt({ role: 'authenticated', ref: REF }))).issues[0].message).toContain('authenticated');
    expect(run(withKey(jwt({ ref: REF }))).issues[0].message).toContain('brak');
  });

  it('odrzuca klucz innego projektu, wygasły, sekretny i pusty publishable', () => {
    expect(run(withKey(jwt({ role: 'anon', ref: 'zzzzzzzzzzzzzzzzzzzz' }))).issues[0].message).toContain(
      'innego projektu',
    );
    expect(run(withKey(jwt({ role: 'anon', ref: REF, exp: NOW - 1 }))).issues[0].message).toContain('wygasł');
    expect(run(withKey('sb_secret_abcdef')).issues[0].message).toContain('sekretny');
    expect(run(withKey('sb_publishable_')).issues[0].message).toContain('za krótki');
  });
});

describe('validateEnv: identyfikatory Google i iosUrlScheme', () => {
  it.each(['webclientid.apps.googleusercontent.com', '123456789012-webclientid', 'GOCSPX-secret'])(
    'odrzuca zły format identyfikatora web: %s',
    (value) => {
      expect(variables({ ...validEnv(), [VARS.googleWebClientId]: value })).toContain(VARS.googleWebClientId);
    },
  );

  it('odrzuca ten sam identyfikator dla web i iOS', () => {
    const same = '123456789012-sameclient.apps.googleusercontent.com';
    const { issues } = run({ ...validEnv(), [VARS.googleWebClientId]: same, [VARS.googleIosClientId]: same });
    expect(issues[0].message).toContain('nie może być taki sam');
  });

  it('reversedClientIdScheme odwraca identyfikator klienta iOS', () => {
    expect(reversedClientIdScheme(IOS_ID)).toBe('com.googleusercontent.apps.123456789012-iosclientid');
    expect(reversedClientIdScheme('inny-format')).toBeNull();
  });

  it('akceptuje zgodny iosUrlScheme, a niezgodny albo brakujący odrzuca', () => {
    const scheme = 'com.googleusercontent.apps.123456789012-iosclientid';
    expect(run(validEnv(), { iosUrlScheme: scheme }).issues).toEqual([]);
    expect(run(validEnv(), { iosUrlScheme: 'com.googleusercontent.apps.999-inny' }).issues[0].message).toContain(
      scheme,
    );
    expect(run(validEnv(), { iosUrlScheme: null }).issues[0].message).toContain('brakuje iosUrlScheme');
  });

  it('bez opcji iosUrlScheme nie sprawdza schematu (walidacja w aplikacji)', () => {
    expect(run(validEnv()).issues).toEqual([]);
  });
});

describe('komunikaty', () => {
  it('maskValue pokazuje tylko początek, a formatIssues daje listę po polsku', () => {
    expect(maskValue('abcdefghijklmnop')).toBe('abcd…');
    const key = jwt({ role: 'admin', ref: REF });
    const text = formatIssues(run({ ...validEnv(), [VARS.supabaseAnonKey]: key }).issues);
    expect(text).toContain('✖ EXPO_PUBLIC_SUPABASE_ANON_KEY:');
    expect(text).not.toContain(key.split('.')[1]);
  });
});
