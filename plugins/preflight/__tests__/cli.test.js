/* global describe, it, expect, Buffer, __dirname */
const path = require('path');
const { spawnSync } = require('child_process');
const { parseEnvFile, parseEasEnvList, checkLive } = require('../cli');
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
