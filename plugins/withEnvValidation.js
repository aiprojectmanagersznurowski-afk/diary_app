const { withDangerousMod } = require('expo/config-plugins');
const { validateEnv, formatIssues } = require('./preflight/validateEnv');

/** Wyszukuje `iosUrlScheme` w konfiguracji wtyczki Google Sign-In (undefined, gdy wtyczki nie ma). */
function findIosUrlScheme(config) {
  const entry = (config.plugins || []).find(
    (p) => (Array.isArray(p) ? p[0] : p) === '@react-native-google-signin/google-signin',
  );
  if (!entry) return undefined;
  return Array.isArray(entry) ? (entry[1] && entry[1].iosUrlScheme) || null : null;
}

/** Rzuca błąd z listą problemów, gdy zmienne `EXPO_PUBLIC_*` są brakujące albo błędne. */
function assertEnv(iosUrlScheme) {
  const { issues } = validateEnv(process.env, { iosUrlScheme });
  if (issues.length > 0) {
    throw new Error(
      `Kontrola konfiguracji przed buildem (preflight) nie przeszła:\n${formatIssues(issues)}\n` +
        'Popraw zmienne (lokalnie .env, na EAS: eas env:create --force) i uruchom npm run preflight. ' +
        'Pominięcie kontroli: SKIP_PREFLIGHT=1.',
    );
  }
}

/**
 * Plugin konfiguracyjny: przerywa `expo prebuild` (także na EAS Build) z listą problemów, gdy zmienne
 * `EXPO_PUBLIC_*` są brakujące albo mają teksty zastępcze. Kontrola siedzi w modzie, który wykonuje się
 * tylko przy prebuildzie, więc `expo start` i `expo config` działają bez `.env` (aplikacja pokaże wtedy
 * ekran „Błąd konfiguracji”). Wyłączany przez `SKIP_PREFLIGHT=1`.
 */
module.exports = function withEnvValidation(config) {
  if (process.env.SKIP_PREFLIGHT === '1') return config;
  const iosUrlScheme = findIosUrlScheme(config);
  const check = (modConfig) => {
    if (process.env.SKIP_PREFLIGHT !== '1') assertEnv(iosUrlScheme);
    return modConfig;
  };
  return withDangerousMod(withDangerousMod(config, ['ios', check]), ['android', check]);
};

module.exports.findIosUrlScheme = findIosUrlScheme;
