// Konfiguracja targetu watchOS (F4-01: sam szkielet, bez logiki nagrywania — patrz F4-02).
// docs/02-architektura.md §6.2, ADR-007, Q5 (05-decyzje.md: watchOS 10+).
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',
  name: 'VocalyWatch',
  displayName: 'Vocaly',
  // Q5 (05-decyzje.md): minimalna wersja watchOS 10.
  deploymentTarget: '10.0',
  frameworks: ['SwiftUI'],
};
