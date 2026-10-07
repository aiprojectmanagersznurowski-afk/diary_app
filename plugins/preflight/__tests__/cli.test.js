/* global describe, it, expect, Buffer, __dirname, beforeEach, afterEach, jest */
const path = require('path');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const { parseEnvFile, parseEasEnvList, checkLive, main } = require('../cli');
const { VARS } = require('../validateEnv');

const CLI = path.join(__dirname, '..', 'cli.js');
const REF = 'abcdefghijklmnopqrst';
const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (payload) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.c2lnbmF0dXJl`;

// Identyfikator iOS zgodny ze schematem w app.json (iosUrlScheme), żeby sprawdzenie schematu przeszło.
const appJson = require('../../../app.json');
const googleEntry = appJson.expo.plugins.find(
  (p) => Array.isArray(p) && p[0] === '@react-native-google-signin/google-signin',
);
const IOS_ID = `${googleEntry[1].iosUrlScheme.replace('com.googleusercontent.apps.', '')}.apps.googleusercontent.com`;

const validEnv = () => ({
  [VARS.supabaseUrl]: `https://${REF}.supabase.co`,
  [VARS.supabaseAnonKey]: jwt({ role: 'anon', ref: REF }),
  [VARS.googleWebClientId]: '123456789012-webclientid.apps.googleusercontent.com',
  [VARS.googleIosClientId]: IOS_ID,
});

function runCli(args, env) {
  return spawnSync(process.execPath, [CLI, ...args], {
    // Czyste środowisko: bez zmiennych EXPO_PUBLIC_* z powłoki uruchamiającej testy.
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf8',
  });
}

describe('parseEnvFile', () => {
  it('czyta KEY=value, pomija komentarze, zdejmuje cudzysłowy i komentarze końcowe', () => {
    const parsed = parseEnvFile(
      ['# komentarz', 'A=1', 'export B="dwa"', "C='trzy'", 'D=cztery # uwaga', '', 'E=a=b'].join('\n'),
    );
    expect(parsed).toEqual({ A: '1', B: 'dwa', C: 'trzy', D: 'cztery', E: 'a=b' });
  });

  it('zdejmuje cudzysłowy także przed komentarzem końcowym i zachowuje # wewnątrz cudzysłowu', () => {
    expect(parseEnvFile('A="abc" # komentarz\nB=\'x # y\' # z\nC="a#b"')).toEqual({ A: 'abc', B: 'x # y', C: 'a#b' });
  });
});

describe('parseEasEnvList', () => {
  it('wyciąga tylko linie EXPO_PUBLIC_*=wartość i ignoruje nagłówki i komunikaty CLI', () => {
    const output = [
      '★ eas-cli@24.11.0 is now available.',
      'Environment: production',
      'EXPO_PUBLIC_A=1',
      'EXPO_PUBLIC_B=a=b',
      'INNA=2',
    ].join('\n');
    expect(parseEasEnvList(output)).toEqual({ EXPO_PUBLIC_A: '1', EXPO_PUBLIC_B: 'a=b' });
  });
});

describe('checkLive', () => {
  const env = validEnv();
  const respond = (status, body) => async () => ({ status, json: async () => body });

  it('brak problemów, gdy Supabase odpowiada i ma włączonych dostawców Apple i Google', async () => {
    const calls = [];
    const fetchFn = async (url, init) => {
      calls.push({ url, key: init.headers.apikey });
      return { status: 200, json: async () => ({ external: { apple: true, google: true } }) };
    };
    expect(await checkLive(env, fetchFn)).toEqual([]);
    expect(calls[0].url).toBe(`https://${REF}.supabase.co/auth/v1/settings`);
    expect(calls[0].key).toBe(env[VARS.supabaseAnonKey]);
  });

  it('zgłasza odrzucony klucz (HTTP 401)', async () => {
    const issues = await checkLive(env, respond(401, { message: 'Invalid API key' }));
    expect(issues[0].message).toContain('HTTP 401');
    expect(issues[0].message).toContain('odrzucił klucz');
  });

  it('inny status (404, 503) to nieoczekiwana odpowiedź przypisana do adresu, nie do klucza', async () => {
    for (const status of [404, 503]) {
      const issues = await checkLive(env, respond(status, {}));
      expect(issues[0].variable).toBe(VARS.supabaseUrl);
      expect(issues[0].message).toContain(`nieoczekiwana odpowiedź Supabase (HTTP ${status})`);
    }
  });

  it('dołącza kod przyczyny błędu sieci', async () => {
    const issues = await checkLive(env, async () => {
      throw Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } });
    });
    expect(issues[0].message).toContain('fetch failed, ENOTFOUND');
  });

  it('zgłasza wyłączonych dostawców Google i Apple', async () => {
    const issues = await checkLive(env, respond(200, { external: { apple: false, google: false } }));
    expect(issues.map((i) => i.variable)).toEqual([
      'Supabase › Authentication › Google',
      'Supabase › Authentication › Apple',
    ]);
  });

  it('zgłasza brak połączenia', async () => {
    const issues = await checkLive(env, async () => {
      throw new Error('ENOTFOUND');
    });
    expect(issues[0].message).toContain('ENOTFOUND');
  });
});

describe('npm run preflight jako proces (kod wyjścia i komunikaty)', () => {
  it('poprawna konfiguracja → kod 0 i komunikat o poprawności', () => {
    const result = runCli(['--process-env'], validEnv());
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Konfiguracja wygląda poprawnie');
  });

  it('teksty zastępcze z incydentu → kod 1 i lista problemów po polsku, bez pełnych wartości', () => {
    const result = runCli(['--process-env'], {
      ...validEnv(),
      [VARS.supabaseAnonKey]: '<anon key z .env>',
      [VARS.googleWebClientId]: '<z .env>',
      [VARS.googleIosClientId]: '<z .env>',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(result.stderr).toContain('tekst zastępczy');
    expect(result.stderr).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
    expect(result.stderr).not.toContain('<anon key z .env>');
    expect(result.stderr).toContain('eas env:create --force');
  });

  it('brak zmiennych → kod 1', () => {
    expect(runCli(['--process-env'], {}).status).toBe(1);
  });

  it('identyfikator iOS niezgodny z iosUrlScheme w app.json → kod 1', () => {
    const result = runCli(['--process-env'], {
      ...validEnv(),
      [VARS.googleIosClientId]: '999999999999-inny.apps.googleusercontent.com',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('iosUrlScheme');
  });
});

describe('main: tryb domyślny czyta .env i .env.local z katalogu projektu', () => {
  let dir;
  let logs;
  let errors;
  const write = (name, values) =>
    fs.writeFileSync(
      path.join(dir, name),
      Object.entries(values)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n'),
    );

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-'));
    fs.copyFileSync(path.join(__dirname, '..', '..', '..', 'app.json'), path.join(dir, 'app.json'));
    logs = [];
    errors = [];
    jest.spyOn(console, 'log').mockImplementation((m) => logs.push(String(m)));
    jest.spyOn(console, 'error').mockImplementation((m) => errors.push(String(m)));
    for (const name of Object.values(VARS)) delete process.env[name];
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('poprawny .env → kod 0', async () => {
    write('.env', validEnv());
    expect(await main([], dir)).toBe(0);
    expect(logs.join('\n')).toContain('.env + zmienne środowiska');
  });

  it('.env.local nadpisuje .env', async () => {
    write('.env', { ...validEnv(), [VARS.supabaseAnonKey]: '<anon key z .env>' });
    write('.env.local', { [VARS.supabaseAnonKey]: validEnv()[VARS.supabaseAnonKey] });
    expect(await main([], dir)).toBe(0);
    expect(logs.join('\n')).toContain('.env + .env.local');
  });

  it('błędny .env bez .env.local → kod 1', async () => {
    write('.env', { ...validEnv(), [VARS.supabaseAnonKey]: '<anon key z .env>' });
    expect(await main([], dir)).toBe(1);
    expect(errors.join('\n')).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('brak plików .env → kod 1 i informacja o braku pliku', async () => {
    expect(await main([], dir)).toBe(1);
    expect(logs.join('\n')).toContain('brak pliku .env');
  });
});
