/**
 * Konfiguracja aplikacji ze zmiennych `EXPO_PUBLIC_*` wstawianych przy bundlowaniu.
 * Walidujemy ją przy starcie, bo build z błędną wartością (tekst zastępczy, zły klucz) dziś kończy się
 * dopiero „Invalid API key” albo crashem natywnego SDK na telefonie (docs/09-audyt-gotowosci.md §1).
 */

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleWebClientId: string;
  googleIosClientId: string;
}

export interface ConfigIssue {
  /** Nazwa zmiennej środowiskowej. */
  variable: string;
  /** Opis problemu po polsku, bez pełnej wartości sekretu. */
  message: string;
}

export interface ConfigResult {
  /** Poprawna konfiguracja albo `null`, gdy są błędy. */
  config: AppConfig | null;
  issues: ConfigIssue[];
  warnings: ConfigIssue[];
}

export type RawEnv = Record<string, string | undefined>;

export const ENV = {
  supabaseUrl: 'EXPO_PUBLIC_SUPABASE_URL',
  supabaseAnonKey: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  googleWebClientId: 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  googleIosClientId: 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
} as const;

const SUPABASE_URL_PATTERN = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/;
const GOOGLE_CLIENT_ID_PATTERN = /^\d{6,}-[a-z0-9]+\.apps\.googleusercontent\.com$/;
const PLACEHOLDER_PATTERNS = [/^<.*>$/, /placeholder/i, /z \.env/i, /^your[-_ ]/i, /^(undefined|null|todo|changeme)$/i];

/** Wartość z zamaskowanym końcem, żeby komunikat nie ujawniał sekretu. */
export function maskValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}…`;
  return `${trimmed.slice(0, 4)}…`;
}

export function isPlaceholder(value: string): boolean {
  const trimmed = value.trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/** Dekoduje base64url bez zależności od `atob` (Hermes/Node). */
function decodeBase64Url(input: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  let bits = 0;
  let acc = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const value = alphabet.indexOf(ch);
    if (value === -1) throw new Error('Nieprawidłowy znak base64');
    acc = (acc << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b >= 0xc0 && b < 0xe0) out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++i] & 0x3f));
    else out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f));
  }
  return out;
}

export interface JwtPayload {
  role?: string;
  ref?: string;
  exp?: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

function checkAnonKey(key: string, projectRef: string | null, nowSeconds: number): string | null {
  if (key.startsWith('sb_publishable_')) {
    return key.length > 'sb_publishable_'.length + 8
      ? null
      : 'klucz sb_publishable_ jest za krótki (brak właściwej części klucza)';
  }
  if (key.startsWith('sb_secret_'))
    return 'to klucz sekretny (sb_secret_…); w aplikacji wolno używać tylko klucza publicznego';
  const payload = decodeJwtPayload(key);
  if (!payload) return 'to nie jest klucz JWT Supabase (oczekiwano klucza „anon public”)';
  if (payload.role !== 'anon') {
    return `klucz ma rolę „${payload.role ?? 'brak'}”, a w aplikacji wolno używać tylko klucza z rolą „anon” (anon public)`;
  }
  if (projectRef && payload.ref && payload.ref !== projectRef) {
    return 'klucz należy do innego projektu Supabase niż podany adres';
  }
  if (payload.exp && payload.exp < nowSeconds) return 'klucz wygasł';
  return null;
}

/** Waliduje komplet zmiennych i zwraca konfigurację albo listę problemów po polsku. */
export function validateAppConfig(env: RawEnv, nowSeconds = Math.floor(Date.now() / 1000)): ConfigResult {
  const issues: ConfigIssue[] = [];
  const warnings: ConfigIssue[] = [];
  const issue = (variable: string, message: string) => issues.push({ variable, message });

  const read = (variable: string): string | null => {
    const raw = env[variable];
    if (raw === undefined || raw.trim() === '') {
      issue(variable, 'brak wartości (zmienna nie została ustawiona w buildzie)');
      return null;
    }
    if (isPlaceholder(raw)) {
      issue(variable, `wartość to tekst zastępczy (${maskValue(raw)}), a nie prawdziwa wartość`);
      return null;
    }
    return raw.trim();
  };

  const url = read(ENV.supabaseUrl);
  let projectRef: string | null = null;
  if (url) {
    const match = SUPABASE_URL_PATTERN.exec(url);
    if (match) projectRef = match[1];
    else issue(ENV.supabaseUrl, 'adres musi mieć postać https://<identyfikator projektu>.supabase.co');
  }

  const anonKey = read(ENV.supabaseAnonKey);
  if (anonKey) {
    const problem = checkAnonKey(anonKey, projectRef, nowSeconds);
    if (problem) issue(ENV.supabaseAnonKey, problem);
  }

  const webId = read(ENV.googleWebClientId);
  if (webId && !GOOGLE_CLIENT_ID_PATTERN.test(webId)) {
    issue(ENV.googleWebClientId, 'identyfikator musi mieć postać <numer>-<ciąg>.apps.googleusercontent.com');
  }
  const iosId = read(ENV.googleIosClientId);
  if (iosId && !GOOGLE_CLIENT_ID_PATTERN.test(iosId)) {
    issue(ENV.googleIosClientId, 'identyfikator musi mieć postać <numer>-<ciąg>.apps.googleusercontent.com');
  }
  if (webId && iosId && webId === iosId) {
    issue(ENV.googleIosClientId, 'identyfikator klienta iOS nie może być taki sam jak identyfikator klienta web');
  }

  if (issues.length > 0 || !url || !anonKey || !webId || !iosId) {
    return { config: null, issues, warnings };
  }
  return {
    config: {
      supabaseUrl: url.replace(/\/+$/, ''),
      supabaseAnonKey: anonKey,
      googleWebClientId: webId,
      googleIosClientId: iosId,
    },
    issues,
    warnings,
  };
}

/**
 * Wczytuje konfigurację z `process.env`. Zmienne muszą być odczytane statycznie (`process.env.EXPO_PUBLIC_X`),
 * bo Expo wstawia wartości tylko w takich odwołaniach; nie wolno przekazywać całego `process.env`.
 */
export function loadAppConfig(): ConfigResult {
  return validateAppConfig({
    [ENV.supabaseUrl]: process.env.EXPO_PUBLIC_SUPABASE_URL,
    [ENV.supabaseAnonKey]: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    [ENV.googleWebClientId]: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    [ENV.googleIosClientId]: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
}

/** Błąd rzucany przy użyciu klienta zbudowanego z niepoprawną konfiguracją. */
export class ConfigError extends Error {
  readonly issues: ConfigIssue[];

  constructor(issues: ConfigIssue[]) {
    super(`Błędna konfiguracja aplikacji: ${issues.map((i) => `${i.variable}: ${i.message}`).join('; ')}`);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}
