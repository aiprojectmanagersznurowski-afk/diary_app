import {
  ConfigError,
  ENV,
  RawEnv,
  decodeJwtPayload,
  isPlaceholder,
  loadAppConfig,
  maskValue,
  validateAppConfig,
} from '../appConfig';

const REF = 'abcdefghijklmnopqrst';
const NOW = 1_800_000_000;

const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (payload: object) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.c2lnbmF0dXJl`;

const validEnv = (): RawEnv => ({
  [ENV.supabaseUrl]: `https://${REF}.supabase.co`,
  [ENV.supabaseAnonKey]: jwt({ role: 'anon', ref: REF, exp: NOW + 10_000 }),
  [ENV.googleWebClientId]: '123456789012-webclientid.apps.googleusercontent.com',
  [ENV.googleIosClientId]: '123456789012-iosclientid.apps.googleusercontent.com',
});

const issuesFor = (env: RawEnv) => validateAppConfig(env, NOW).issues;
const variablesWithIssues = (env: RawEnv) => issuesFor(env).map((i) => i.variable);

describe('validateAppConfig: poprawna konfiguracja', () => {
  it('akceptuje poprawny komplet i zwraca konfigurację', () => {
    const result = validateAppConfig(validEnv(), NOW);
    expect(result.issues).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.config).toEqual({
      supabaseUrl: `https://${REF}.supabase.co`,
      supabaseAnonKey: validEnv()[ENV.supabaseAnonKey],
      googleWebClientId: '123456789012-webclientid.apps.googleusercontent.com',
      googleIosClientId: '123456789012-iosclientid.apps.googleusercontent.com',
    });
  });

  it('akceptuje nowy format klucza publicznego sb_publishable_ i adres z ukośnikiem', () => {
    const env = {
      ...validEnv(),
      [ENV.supabaseAnonKey]: 'sb_publishable_AbCdEf123456',
      [ENV.supabaseUrl]: `https://${REF}.supabase.co/`,
    };
    expect(issuesFor(env)).toEqual([]);
  });

  it('klucz bez pola exp lub ref jest akceptowany (starsze klucze)', () => {
    const env = { ...validEnv(), [ENV.supabaseAnonKey]: jwt({ role: 'anon' }) };
    expect(issuesFor(env)).toEqual([]);
  });
});

describe('validateAppConfig: braki i teksty zastępcze', () => {
  it.each(Object.values(ENV))('odrzuca brak zmiennej %s', (variable) => {
    const env = validEnv();
    delete env[variable];
    const result = validateAppConfig(env, NOW);
    expect(result.config).toBeNull();
    expect(result.issues.map((i) => i.variable)).toContain(variable);
    expect(result.issues.find((i) => i.variable === variable)?.message).toContain('brak wartości');
  });

  it('odrzuca pustą wartość i same spacje', () => {
    expect(variablesWithIssues({ ...validEnv(), [ENV.supabaseAnonKey]: '' })).toContain(ENV.supabaseAnonKey);
    expect(variablesWithIssues({ ...validEnv(), [ENV.supabaseAnonKey]: '   ' })).toContain(ENV.supabaseAnonKey);
  });

  it.each([
    '<anon key z .env>',
    '<z .env>',
    'placeholder-anon-key',
    'https://placeholder.supabase.co',
    'your-key-here',
    'undefined',
    'null',
    'changeme',
  ])('rozpoznaje tekst zastępczy: %s', (value) => {
    expect(isPlaceholder(value)).toBe(true);
    const result = validateAppConfig({ ...validEnv(), [ENV.supabaseAnonKey]: value }, NOW);
    expect(result.config).toBeNull();
    expect(result.issues.find((i) => i.variable === ENV.supabaseAnonKey)?.message).toContain('tekst zastępczy');
  });

  it('te trzy zmienne z incydentu (tekst zastępczy w EAS) są odrzucone jednocześnie', () => {
    const result = validateAppConfig(
      {
        ...validEnv(),
        [ENV.supabaseAnonKey]: '<anon key z .env>',
        [ENV.googleWebClientId]: '<z .env>',
        [ENV.googleIosClientId]: '<z .env>',
      },
      NOW,
    );
    expect(result.config).toBeNull();
    expect(result.issues.map((i) => i.variable).sort()).toEqual(
      [ENV.googleIosClientId, ENV.googleWebClientId, ENV.supabaseAnonKey].sort(),
    );
  });

  it('prawdziwe wartości nie są uznawane za tekst zastępczy', () => {
    expect(isPlaceholder(validEnv()[ENV.supabaseAnonKey] as string)).toBe(false);
    expect(isPlaceholder(`https://${REF}.supabase.co`)).toBe(false);
  });
});

describe('validateAppConfig: adres Supabase', () => {
  it.each([
    'http://abcdefghijklmnopqrst.supabase.co',
    'https://short.supabase.co',
    'https://abcdefghijklmnopqrst.supabase.com',
    'https://abcdefghijklmnopqrst.supabase.co/rest/v1',
    'abcdefghijklmnopqrst.supabase.co',
    'https://localhost:54321',
  ])('odrzuca %s', (url) => {
    const result = validateAppConfig({ ...validEnv(), [ENV.supabaseUrl]: url }, NOW);
    expect(result.config).toBeNull();
    expect(variablesWithIssues({ ...validEnv(), [ENV.supabaseUrl]: url })).toContain(ENV.supabaseUrl);
  });
});

describe('validateAppConfig: klucz anon', () => {
  const withKey = (key: string) => ({ ...validEnv(), [ENV.supabaseAnonKey]: key });

  it('odrzuca ciąg, który nie jest JWT', () => {
    expect(issuesFor(withKey('to-nie-jest-jwt'))[0].message).toContain('nie jest klucz JWT');
    expect(issuesFor(withKey('a.b.c'))[0].message).toContain('nie jest klucz JWT');
  });

  it('odrzuca klucz o roli uprzywilejowanej (w aplikacji wolno tylko rolę anon)', () => {
    const issues = issuesFor(withKey(jwt({ role: 'admin', ref: REF })));
    expect(issues[0].variable).toBe(ENV.supabaseAnonKey);
    expect(issues[0].message).toContain('admin');
    expect(issues[0].message).toContain('wolno używać tylko klucza z rolą „anon”');
  });

  it('odrzuca klucz sekretny sb_secret_', () => {
    expect(issuesFor(withKey('sb_secret_abcdef'))[0].message).toContain('sekretny');
  });

  it('odrzuca inną rolę niż anon', () => {
    expect(issuesFor(withKey(jwt({ role: 'authenticated', ref: REF })))[0].message).toContain('authenticated');
    expect(issuesFor(withKey(jwt({ ref: REF })))[0].message).toContain('brak');
  });

  it('odrzuca klucz z innego projektu niż adres', () => {
    const issues = issuesFor(withKey(jwt({ role: 'anon', ref: 'zzzzzzzzzzzzzzzzzzzz' })));
    expect(issues[0].message).toContain('innego projektu');
  });

  it('odrzuca wygasły klucz', () => {
    expect(issuesFor(withKey(jwt({ role: 'anon', ref: REF, exp: NOW - 1 })))[0].message).toContain('wygasł');
  });
});

describe('validateAppConfig: identyfikatory Google', () => {
  it.each([
    'webclientid.apps.googleusercontent.com',
    '123456789012-webclientid',
    '12-ab.apps.googleusercontent.com',
    'GOCSPX-secret',
  ])('odrzuca zły format identyfikatora web: %s', (value) => {
    expect(variablesWithIssues({ ...validEnv(), [ENV.googleWebClientId]: value })).toContain(ENV.googleWebClientId);
  });

  it('odrzuca zły format identyfikatora iOS', () => {
    expect(variablesWithIssues({ ...validEnv(), [ENV.googleIosClientId]: 'ios-client' })).toContain(
      ENV.googleIosClientId,
    );
  });

  it('odrzuca ten sam identyfikator dla web i iOS', () => {
    const same = '123456789012-sameclient.apps.googleusercontent.com';
    const result = validateAppConfig(
      { ...validEnv(), [ENV.googleWebClientId]: same, [ENV.googleIosClientId]: same },
      NOW,
    );
    expect(result.config).toBeNull();
    expect(result.issues[0].message).toContain('nie może być taki sam');
  });
});

describe('komunikaty nie ujawniają sekretów', () => {
  it('maskValue pokazuje tylko początek', () => {
    expect(maskValue('abcdefghijklmnop')).toBe('abcd…');
    expect(maskValue('abc')).toBe('ab…');
  });

  it('żaden komunikat nie zawiera pełnej wartości klucza ani identyfikatora', () => {
    const key = jwt({ role: 'admin', ref: 'zzzzzzzzzzzzzzzzzzzz' });
    const placeholderKey = '<anon key z .env>';
    const text = JSON.stringify(
      validateAppConfig({ ...validEnv(), [ENV.supabaseAnonKey]: key, [ENV.googleWebClientId]: placeholderKey }, NOW),
    );
    expect(text).not.toContain(key);
    expect(text).not.toContain(key.split('.')[1]);
  });
});

describe('decodeJwtPayload i loadAppConfig', () => {
  it('dekoduje poprawny ładunek i zwraca null dla błędnego', () => {
    expect(decodeJwtPayload(jwt({ role: 'anon', ref: REF }))).toEqual({ role: 'anon', ref: REF });
    expect(decodeJwtPayload('a.b')).toBeNull();
    expect(decodeJwtPayload('a.***.c')).toBeNull();
  });

  it('dekoduje ładunek ze znakami spoza ASCII', () => {
    expect(decodeJwtPayload(jwt({ role: 'anon', name: 'Zażółć gęślą jaźń' }))).toMatchObject({
      name: 'Zażółć gęślą jaźń',
    });
  });

  describe('loadAppConfig czyta process.env', () => {
    const names = Object.values(ENV);
    const saved: Record<string, string | undefined> = {};

    beforeEach(() => {
      for (const name of names) saved[name] = process.env[name];
    });

    afterEach(() => {
      // Przywracamy pojedyncze klucze na tym samym obiekcie (bez podmiany całego process.env).
      for (const name of names) {
        if (saved[name] === undefined) delete process.env[name];
        else process.env[name] = saved[name];
      }
    });

    it('buduje konfigurację ze statycznych odwołań do process.env', () => {
      for (const [name, value] of Object.entries(validEnv())) process.env[name] = value;
      const result = loadAppConfig();
      expect(result.issues).toEqual([]);
      expect(result.config?.supabaseUrl).toBe(`https://${REF}.supabase.co`);
    });

    it('zgłasza błędy, gdy zmienne w process.env są puste', () => {
      for (const name of names) delete process.env[name];
      const result = loadAppConfig();
      expect(result.config).toBeNull();
      expect(result.issues.length).toBe(4);
    });
  });
});

describe('ConfigError', () => {
  it('niesie listę problemów i czytelny komunikat', () => {
    const error = new ConfigError([{ variable: ENV.supabaseUrl, message: 'brak wartości' }]);
    expect(error.name).toBe('ConfigError');
    expect(error.issues).toHaveLength(1);
    expect(error.message).toContain(ENV.supabaseUrl);
    expect(error).toBeInstanceOf(Error);
  });
});
