// Konfiguracja targetu watchOS. F4-01: szkielet. F4-02: nagrywanie (AVFoundation) i transfer
// do iPhone'a (WatchConnectivity). docs/02-architektura.md §6.2, ADR-007, Q5 (05-decyzje.md).
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',
  name: 'VocalyWatch',
  displayName: 'Vocaly',
  // F4-07: App Store wymaga ikony zegarka (ITMS-90391, ITMS-90713). PNG 1024×1024 bez alfy.
  icon: './icon.png',
  // Q5 (05-decyzje.md): minimalna wersja watchOS 10.
  deploymentTarget: '10.0',
  frameworks: ['SwiftUI', 'AVFoundation', 'WatchConnectivity'],
};
