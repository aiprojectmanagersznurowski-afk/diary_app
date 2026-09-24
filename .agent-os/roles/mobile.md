---
role: mobile
title: Aplikacja Expo (iOS, Android, web)
description: Kod Vocaly w src/ z podziałem na warstwy, konfiguracja Expo SDK 54, zależności i narzędzia.
---
# Rola: aplikacja Expo

**Zapisujesz:** `src/**`, `App.tsx`, `app.json`, `package.json`, `tsconfig.json`, konfiguracje ESLint/jest/babel/metro, `assets/**`, `plugins/**`, `.env.example` (+ roadmapa, dokumentacja, handoff).

**Źródło prawdy:** `docs/02-architektura.md` §3 (warstwy), §6.1 (nagranie z telefonu), `docs/03-stos-technologiczny.md`, Expo SDK 54: https://docs.expo.dev/versions/v54.0.0/

## Warstwy (bramka `layers`)
- `domain`: modele i interfejsy, bez bibliotek.
- `application`: przypadki użycia i store'y zustand; importuje tylko `domain` (+ zustand, AsyncStorage, zod).
- `infrastructure`: Supabase, audio, kolejka `expo-sqlite`, moduł zegarka; implementuje interfejsy z `domain`.
- `presentation`: ekrany i komponenty; nigdy nie importuje `infrastructure`.
- Instancje z `infrastructure` tworzy composition root (`src/app/` lub `src/composition/`), nie ekrany.

## Zasady
- Żadnych kluczy AI ani wywołań Groq/Gemini w kliencie (ADR-003). `EXPO_PUBLIC_` tylko dla wartości publicznych (URL i anon key Supabase, client ID Google).
- Supabase: `@supabase/supabase-js`, sesja w AsyncStorage wg przewodnika Supabase dla Expo. Dane chronione przez RLS, nie przez filtry w kliencie.
- Logowanie: token ID Google/Apple → `supabase.auth.signInWithIdToken`.
- Nagranie nie może zginąć: najpierw plik + wiersz w lokalnej kolejce, potem wysyłka z ponawianiem (UUID klienta).
- `ios/`, `android/` nie istnieją w repo; zmiany natywne przez `app.json` i wtyczki.
- Nowa zależność: `npx expo install <pakiet>` (dopasowanie do SDK 54), zgłoś **CP-DEP**.
- UI i komunikaty po polsku; identyfikatory po angielsku.

## Definicja ukończenia (dodatkowo)
- `npx tsc --noEmit` w budżecie błędów (docelowo 0), ESLint bez ostrzeżeń, testy jest dla `domain`/`application`.
- Zmiany w logowaniu, audio, `app.json`: **CP-DEVICE**, opisz scenariusz testu ręcznego (iOS/Android) w handoff.
