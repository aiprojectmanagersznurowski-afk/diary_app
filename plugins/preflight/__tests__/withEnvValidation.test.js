/* global describe, it, expect, beforeEach, afterEach, Buffer */
const withEnvValidation = require('../../withEnvValidation');
const { findIosUrlScheme } = require('../iosUrlScheme');
const { VARS } = require('../validateEnv');

const REF = 'abcdefghijklmnopqrst';
const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (payload) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.c2lnbmF0dXJl`;
const SCHEME = 'com.googleusercontent.apps.123456789012-iosclientid';

const validEnv = () => ({
  [VARS.supabaseUrl]: `https://${REF}.supabase.co`,
  [VARS.supabaseAnonKey]: jwt({ role: 'anon', ref: REF }),
  [VARS.googleWebClientId]: '123456789012-webclientid.apps.googleusercontent.com',
  [VARS.googleIosClientId]: '123456789012-iosclientid.apps.googleusercontent.com',
});

const configWithScheme = (scheme) => ({
  name: 'x',
  plugins: ['expo-font', ['@react-native-google-signin/google-signin', { iosUrlScheme: scheme }]],
});

const NAMES = [...Object.values(VARS), 'SKIP_PREFLIGHT'];
const saved = {};

function setEnv(env) {
  for (const name of NAMES) delete process.env[name];
  Object.assign(process.env, env);
}

beforeEach(() => {
  for (const name of NAMES) saved[name] = process.env[name];
});

afterEach(() => {
  for (const name of NAMES) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

describe('findIosUrlScheme', () => {
  it('znajduje schemat w konfiguracji wtyczki Google Sign-In', () => {
    expect(findIosUrlScheme(configWithScheme(SCHEME))).toBe(SCHEME);
  });

  it('zwraca null, gdy wtyczka nie ma konfiguracji, i undefined, gdy wtyczki nie ma', () => {
    expect(findIosUrlScheme({ plugins: ['@react-native-google-signin/google-signin'] })).toBeNull();
    expect(findIosUrlScheme({ plugins: ['expo-font'] })).toBeUndefined();
    expect(findIosUrlScheme({})).toBeUndefined();
  });
});

const runIosMod = (config) => config.mods.ios.dangerous({ modRequest: {}, modResults: {} });
const runAndroidMod = (config) => config.mods.android.dangerous({ modRequest: {}, modResults: {} });

describe('withEnvValidation (plugin prebuildu)', () => {
  it('samo wyliczenie konfiguracji (expo start, expo config) nie rzuca nawet bez zmiennych', () => {
    setEnv({});
    expect(() => withEnvValidation(configWithScheme(SCHEME))).not.toThrow();
  });

  it('przy poprawnych zmiennych mody prebuildu przechodzą na obu platformach', async () => {
    setEnv(validEnv());
    const config = withEnvValidation(configWithScheme(SCHEME));
    await expect(runIosMod(config)).resolves.toBeDefined();
    await expect(runAndroidMod(config)).resolves.toBeDefined();
  });

  it('przy tekstach zastępczych prebuild przerywa z listą problemów po polsku', async () => {
    setEnv({ ...validEnv(), [VARS.supabaseAnonKey]: '<anon key z .env>' });
    const config = withEnvValidation(configWithScheme(SCHEME));
    await expect(runIosMod(config)).rejects.toThrow(
      /preflight\) nie przeszła[\s\S]*EXPO_PUBLIC_SUPABASE_ANON_KEY[\s\S]*tekst zastępczy/,
    );
    await expect(runAndroidMod(config)).rejects.toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('przy braku zmiennych prebuild przerywa i podpowiada SKIP_PREFLIGHT', async () => {
    setEnv({});
    await expect(runIosMod(withEnvValidation(configWithScheme(SCHEME)))).rejects.toThrow(/SKIP_PREFLIGHT=1/);
  });

  it('przy niezgodnym iosUrlScheme prebuild przerywa', async () => {
    setEnv(validEnv());
    const config = withEnvValidation(configWithScheme('com.googleusercontent.apps.999-inny'));
    await expect(runIosMod(config)).rejects.toThrow(/iosUrlScheme/);
  });

  it('SKIP_PREFLIGHT=1 pomija kontrolę nawet przy błędnych zmiennych', () => {
    setEnv({ SKIP_PREFLIGHT: '1' });
    const config = configWithScheme(SCHEME);
    expect(withEnvValidation(config)).toBe(config);
  });

  it('SKIP_PREFLIGHT=1 ustawione dopiero po wyliczeniu konfiguracji też pomija kontrolę w modzie', async () => {
    setEnv({});
    const config = withEnvValidation(configWithScheme(SCHEME));
    process.env.SKIP_PREFLIGHT = '1';
    await expect(runIosMod(config)).resolves.toBeDefined();
  });
});
