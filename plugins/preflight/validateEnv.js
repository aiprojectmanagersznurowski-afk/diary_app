/* global Buffer */
/**
 * Walidacja zmiennych `EXPO_PUBLIC_*` przed buildem (docs/09-audyt-gotowosci.md §6).
 * Te same reguły i komunikaty co `src/infrastructure/config/appConfig.ts` (walidacja w aplikacji):
 * Metro nie zbundluje modułu z `plugins/` (Node), a plugin nie wczyta TypeScriptu, więc są to dwie
 * implementacje; test zgodności (`__tests__/parity.test.ts`) pilnuje, żeby się nie rozjechały.
 * Moduł używa tylko wbudowanych API Node.js, bo działa też w hooku `eas-build-pre-install`
 * (przed instalacją zależności).
 */

const VARS = {
  supabaseUrl: 'EXPO_PUBLIC_SUPABASE_URL',
  supabaseAnonKey: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  googleWebClientId: 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  googleIosClientId: 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
};

const SUPABASE_URL_PATTERN = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/;
const GOOGLE_CLIENT_ID_PATTERN = /^\d{6,}-[a-z0-9]+\.apps\.googleusercontent\.com$/;
const PLACEHOLDER_PATTERNS = [/^<.*>$/, /placeholder/i, /z \.env/i, /^your[-_ ]/i, /^(undefined|null|todo|changeme)$/i];

function maskValue(value) {
  const trimmed = String(value).trim();
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}…`;
  return `${trimmed.slice(0, 4)}…`;
}

function isPlaceholder(value) {
  const trimmed = String(value).trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    // Jak w appConfig.ts: znak spoza alfabetu base64url to błąd, a payload niebędący obiektem nie ma pól (role itd.).
    if (!/^[A-Za-z0-9_-]*={0,2}$/.test(parts[1])) return null;
    const parsed = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return parsed || null;
  } catch {
    return null;
  }
}

function checkAnonKey(key, projectRef, nowSeconds) {
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

/** Schemat URL Google dla identyfikatora klienta iOS: odwrócony identyfikator (com.googleusercontent.apps.<id>). */
function reversedClientIdScheme(iosClientId) {
  const suffix = '.apps.googleusercontent.com';
  return iosClientId.endsWith(suffix) ? `com.googleusercontent.apps.${iosClientId.slice(0, -suffix.length)}` : null;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ iosUrlScheme?: string | null, nowSeconds?: number }} [options]
 * @returns {{ issues: {variable: string, message: string}[], warnings: {variable: string, message: string}[] }}
 */
function validateEnv(env, options = {}) {
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const issues = [];
  const warnings = [];
  const issue = (variable, message) => issues.push({ variable, message });

  const read = (variable) => {
    const raw = env[variable];
    if (raw === undefined || String(raw).trim() === '') {
      issue(variable, 'brak wartości (zmienna nie została ustawiona w buildzie)');
      return null;
    }
    if (isPlaceholder(raw)) {
      issue(variable, `wartość to tekst zastępczy (${maskValue(raw)}), a nie prawdziwa wartość`);
      return null;
    }
    return String(raw).trim();
  };

  const url = read(VARS.supabaseUrl);
  let projectRef = null;
  if (url) {
    const match = SUPABASE_URL_PATTERN.exec(url);
    if (match) projectRef = match[1];
    else issue(VARS.supabaseUrl, 'adres musi mieć postać https://<identyfikator projektu>.supabase.co');
  }

  const anonKey = read(VARS.supabaseAnonKey);
  if (anonKey) {
    const problem = checkAnonKey(anonKey, projectRef, nowSeconds);
    if (problem) issue(VARS.supabaseAnonKey, problem);
  }

  const webId = read(VARS.googleWebClientId);
  if (webId && !GOOGLE_CLIENT_ID_PATTERN.test(webId)) {
    issue(VARS.googleWebClientId, 'identyfikator musi mieć postać <numer>-<ciąg>.apps.googleusercontent.com');
  }
  const iosId = read(VARS.googleIosClientId);
  if (iosId && !GOOGLE_CLIENT_ID_PATTERN.test(iosId)) {
    issue(VARS.googleIosClientId, 'identyfikator musi mieć postać <numer>-<ciąg>.apps.googleusercontent.com');
  }
  if (webId && iosId && webId === iosId) {
    issue(VARS.googleIosClientId, 'identyfikator klienta iOS nie może być taki sam jak identyfikator klienta web');
  }

  // Tylko build-time: schemat URL w app.json (wtyczka Google Sign-In) musi odpowiadać identyfikatorowi iOS,
  // inaczej logowanie Google nie wraca do aplikacji.
  if (options.iosUrlScheme !== undefined && iosId && GOOGLE_CLIENT_ID_PATTERN.test(iosId)) {
    const expected = reversedClientIdScheme(iosId);
    if (!options.iosUrlScheme) {
      issue(
        VARS.googleIosClientId,
        'w app.json brakuje iosUrlScheme wtyczki Google Sign-In (logowanie Google nie wróci do aplikacji)',
      );
    } else if (options.iosUrlScheme !== expected) {
      issue(
        VARS.googleIosClientId,
        `identyfikator klienta iOS nie zgadza się z iosUrlScheme w app.json (oczekiwano ${expected})`,
      );
    }
  }

  return { issues, warnings };
}

/** Lista problemów w czytelnej, polskiej formie (do konsoli i komunikatu błędu pluginu). */
function formatIssues(issues) {
  return issues.map((i) => `  ✖ ${i.variable}: ${i.message}`).join('\n');
}

module.exports = {
  VARS,
  validateEnv,
  formatIssues,
  isPlaceholder,
  maskValue,
  decodeJwtPayload,
  reversedClientIdScheme,
};
