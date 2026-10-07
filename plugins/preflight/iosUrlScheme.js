// Bez zależności: używany przez CLI w haku eas-build-pre-install, który działa przed instalacją node_modules.

/** Wyszukuje `iosUrlScheme` w konfiguracji wtyczki Google Sign-In (undefined, gdy wtyczki nie ma). */
function findIosUrlScheme(config) {
  const entry = (config.plugins || []).find(
    (p) => (Array.isArray(p) ? p[0] : p) === '@react-native-google-signin/google-signin',
  );
  if (!entry) return undefined;
  return Array.isArray(entry) ? (entry[1] && entry[1].iosUrlScheme) || null : null;
}

module.exports = { findIosUrlScheme };
