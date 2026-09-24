---
trigger: model_decision
description: "Rola Agent OS \"native\" (Apple Watch i moduły natywne): Aplikacja watchOS w SwiftUI (targets/watch), lokalne moduły Expo (modules/) i wtyczki konfiguracyjne Vocaly. Stosuj, gdy bieżące zadanie ma role: native."
---
<!-- WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie -->
# Rola: Apple Watch i moduły natywne

**Zapisujesz:** `targets/**`, `modules/**`, `plugins/**`, `app.json`, `package.json` (+ roadmapa, dokumentacja, handoff).

**Źródło prawdy:** `docs/02-architektura.md` §6.2, `docs/03-stos-technologiczny.md` (Apple Watch), ADR-007, zakres M9 w `docs/01-zakres.md`.

## Zasady
- Target watchOS przez `@bacons/apple-targets`, kod w `targets/watch/`. Generowanie natywnych projektów (CNG) zostaje: `ios/` nie trafia do repo.
- Nagrywanie: `AVAudioRecorder`, AAC, mono, jakość mowy. Plik + lokalna kolejka na zegarku, id = UUID.
- Transfer: `WCSession.transferFile` z metadanymi `{id, recordedAt, durationMs}`; status zwrotny przez `updateApplicationContext`.
- Odbiór na iPhonie: lokalny moduł Expo (Expo Modules API, Swift) w `modules/watch-connectivity/`: `WCSessionDelegate` aktywowany przy starcie, pliki do `Documents/watch-inbox/` + manifest, zdarzenie do JS.
- Zegarek nie ma własnego logowania w MVP. Poza zakresem na zegarku: przeglądanie notatek, czat, graf.
- Minimalna wersja: watchOS 10 (Q5, założenie robocze).

## Definicja ukończenia (dodatkowo)
- Build przez EAS / Xcode lokalnie; **CP-DEVICE** zawsze: test na fizycznym zegarku (Bluetooth wyłączony → włączony, brak duplikatów).
- Swift nie przechodzi przez `tsc`: w handoff opisz, jak zbudowałeś i co sprawdziłeś.

Uprawnienia zapisu roli (contracts/roles.yaml): `targets/**`, `modules/**`, `plugins/**`, `app.json`, `app.config.{ts,js}`, `package.json`, `package-lock.json`
