#!/usr/bin/env node
/* global __dirname */
/**
 * Kontrola konfiguracji przed buildem: `npm run preflight`.
 *   (bez flag)       .env + zmienne procesu
 *   --eas            zmienne środowiska EAS „production” (eas env:list; wymaga zalogowania)
 *   --process-env    tylko zmienne procesu (hak eas-build-pre-install na serwerze EAS)
 *   --live           dodatkowo sprawdza, czy Supabase odpowiada i ma włączonych dostawców Apple i Google
 * Kod wyjścia: 0 = brak błędów (ostrzeżenia dopuszczalne), 1 = są błędy, 2 = błąd użycia/narzędzia.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { validateEnv, formatIssues, VARS } = require('./validateEnv');
const { findIosUrlScheme } = require('../withEnvValidation');

const ROOT = path.join(__dirname, '..', '..');

/** Parsuje plik .env (KEY=value, komentarze #, opcjonalne cudzysłowy); nie zmienia process.env. */
function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    const quoted = /^(['"])(.*?)\1(?:\s+#.*)?$/.exec(value);
    if (quoted) value = quoted[2];
    else value = value.replace(/\s+#.*$/, '');
    out[m[1]] = value;
  }
  return out;
}

/** Parsuje wynik `eas env:list` (linie NAZWA=wartość); ignoruje nagłówki i komunikaty CLI. */
function parseEasEnvList(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^(EXPO_PUBLIC_[A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function readIosUrlScheme(root) {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo || {};
  return findIosUrlScheme(app);
}

/** Sprawdza na żywo, czy Supabase odpowiada i ma włączonych dostawców Apple i Google. */
async function checkLive(env, fetchFn = fetch) {
  const issues = [];
  const url = String(env[VARS.supabaseUrl] || '').replace(/\/+$/, '');
  const key = env[VARS.supabaseAnonKey];
  try {
    const res = await fetchFn(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (res.status === 401 || res.status === 403) {
      issues.push({
        variable: VARS.supabaseAnonKey,
        message: `Supabase odrzucił klucz (HTTP ${res.status}) — sprawdź adres i klucz`,
      });
      return issues;
    }
    if (res.status !== 200) {
      issues.push({
        variable: VARS.supabaseUrl,
        message: `nieoczekiwana odpowiedź Supabase (HTTP ${res.status}) — sprawdź adres projektu`,
      });
      return issues;
    }
    const settings = await res.json();
    const external = (settings && settings.external) || {};
    if (!external.google)
      issues.push({ variable: 'Supabase › Authentication › Google', message: 'dostawca Google jest wyłączony' });
    if (!external.apple)
      issues.push({ variable: 'Supabase › Authentication › Apple', message: 'dostawca Apple jest wyłączony' });
  } catch (error) {
    issues.push({
      variable: VARS.supabaseUrl,
      message: `nie udało się połączyć z Supabase (${[error.message, error.cause && error.cause.code].filter(Boolean).join(', ')})`,
    });
  }
  return issues;
}

function readEnvFiles(root) {
  const files = ['.env', '.env.local'].filter((name) => fs.existsSync(path.join(root, name)));
  const merged = {};
  for (const name of files) Object.assign(merged, parseEnvFile(fs.readFileSync(path.join(root, name), 'utf8')));
  return { values: merged, files };
}

function loadEnv(args, root) {
  if (args.includes('--eas')) {
    const output = execFileSync(
      'eas',
      ['env:list', '--environment', 'production', '--include-sensitive', '--format', 'short'],
      { encoding: 'utf8', cwd: root },
    );
    return { env: parseEasEnvList(output), source: 'EAS (production)' };
  }
  if (args.includes('--process-env')) return { env: { ...process.env }, source: 'zmienne środowiska' };
  // Kolejność jak w Expo: zmienne procesu > .env.local > .env.
  const { values, files } = readEnvFiles(root);
  return {
    env: { ...values, ...process.env },
    source: files.length ? `${files.join(' + ')} + zmienne środowiska` : 'zmienne środowiska (brak pliku .env)',
  };
}

async function main(args, root = ROOT) {
  let loaded;
  try {
    loaded = loadEnv(args, root);
  } catch (error) {
    console.error(`Nie udało się wczytać zmiennych: ${error.message}`);
    return 2;
  }
  const { env, source } = loaded;
  const { issues, warnings } = validateEnv(env, { iosUrlScheme: readIosUrlScheme(root) });
  const all = [...issues];
  if (args.includes('--live') && issues.length === 0) all.push(...(await checkLive(env)));

  console.log(`Kontrola konfiguracji (${source})`);
  if (warnings.length) console.log(warnings.map((w) => `  ⚠ ${w.variable}: ${w.message}`).join('\n'));
  if (all.length === 0) {
    console.log('  ✔ Konfiguracja wygląda poprawnie.');
    return 0;
  }
  console.error(formatIssues(all));
  console.error('\nPopraw zmienne (lokalnie .env, na EAS: eas env:create --force) i uruchom kontrolę ponownie.');
  return 1;
}

module.exports = { parseEnvFile, parseEasEnvList, checkLive, main };

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
