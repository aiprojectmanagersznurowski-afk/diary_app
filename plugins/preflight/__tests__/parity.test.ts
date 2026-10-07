/**
 * Dwie implementacje tych samych reguł (aplikacja: TypeScript, build: Node.js) muszą dawać identyczne wyniki:
 * te same zmienne z błędami i te same komunikaty dla tych samych danych wejściowych.
 */
import { validateAppConfig } from '../../../src/infrastructure/config/appConfig';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { validateEnv } = require('../validateEnv');

const REF = 'abcdefghijklmnopqrst';
const NOW = 1_800_000_000;
const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = (payload: object) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.c2lnbmF0dXJl`;

const base = () => ({
  EXPO_PUBLIC_SUPABASE_URL: `https://${REF}.supabase.co`,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt({ role: 'anon', ref: REF, exp: NOW + 10_000 }),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '123456789012-webclientid.apps.googleusercontent.com',
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '123456789012-iosclientid.apps.googleusercontent.com',
});

const override = (patch: Record<string, string>) => ({ ...base(), ...patch });
const without = (name: string) => {
  const env: Record<string, string> = base();
  delete env[name];
  return env;
};

const CASES: Record<string, Record<string, string | undefined>> = {
  'poprawny komplet': base(),
  'brak adresu': without('EXPO_PUBLIC_SUPABASE_URL'),
  'brak klucza': without('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  'brak web': without('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
  'brak iOS': without('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
  'pusty klucz': override({ EXPO_PUBLIC_SUPABASE_ANON_KEY: '' }),
  'tekst zastępczy klucza': override({ EXPO_PUBLIC_SUPABASE_ANON_KEY: '<anon key z .env>' }),
  'tekst zastępczy Google': override({
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '<z .env>',
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '<z .env>',
  }),
  'adres http': override({ EXPO_PUBLIC_SUPABASE_URL: 'http://abcdefghijklmnopqrst.supabase.co' }),
  'adres z końcówką': override({ EXPO_PUBLIC_SUPABASE_URL: `https://${REF}.supabase.co/rest/v1` }),
  'adres z ukośnikiem': override({ EXPO_PUBLIC_SUPABASE_URL: `https://${REF}.supabase.co/` }),
  'klucz nie-JWT': override({ EXPO_PUBLIC_SUPABASE_ANON_KEY: 'abc' }),
  'rola admin': override({ EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt({ role: 'admin', ref: REF }) }),
  'brak roli': override({ EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt({ ref: REF }) }),
  'inny projekt': override({ EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt({ role: 'anon', ref: 'zzzzzzzzzzzzzzzzzzzz' }) }),
  'klucz wygasły': override({ EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt({ role: 'anon', ref: REF, exp: NOW - 1 }) }),
  'klucz sekretny': override({ EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_abcdef' }),
  'publishable poprawny': override({ EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_AbCdEf123456' }),
  'publishable pusty': override({ EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_' }),
  'zły format web': override({ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'GOCSPX-secret' }),
  'zły format iOS': override({ EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios-client' }),
  'ten sam identyfikator': override({
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '123456789012-same.apps.googleusercontent.com',
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: '123456789012-same.apps.googleusercontent.com',
  }),
  'wszystko źle': { EXPO_PUBLIC_SUPABASE_URL: 'x', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'y' },
};

describe('zgodność walidatora w aplikacji (TS) i przed buildem (Node)', () => {
  it.each(Object.entries(CASES))(
    '%s: identyczne problemy',
    (_name: string, env: Record<string, string | undefined>) => {
      const app = validateAppConfig(env, NOW);
      const build = validateEnv(env, { nowSeconds: NOW });
      expect(build.issues).toEqual(app.issues);
      expect(build.warnings).toEqual(app.warnings);
    },
  );

  it('pokrywa zarówno przypadki poprawne, jak i błędne', () => {
    const valid = Object.values(CASES).filter(
      (env: Record<string, string | undefined>) => validateEnv(env, { nowSeconds: NOW }).issues.length === 0,
    );
    expect(valid.length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(CASES).length - valid.length).toBeGreaterThanOrEqual(15);
  });
});
