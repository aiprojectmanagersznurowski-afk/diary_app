# Stos technologiczny

Wersje w kolumnie „obecnie” odpowiadają `package.json` i `node_modules` na dzień 2026-09-23.

## Aplikacja mobilna i webowa

| Obszar | Obecnie | Docelowo | Uwagi |
|---|---|---|---|
| Framework | ✅ Expo SDK 54, React Native 0.81.5, React 19.1 | bez zmian | dokumentacja: https://docs.expo.dev/versions/v54.0.0/ |
| Język | ✅ TypeScript 5.9 (`strict`) | bez zmian | `tsc --noEmit` musi przechodzić bez błędów |
| Nawigacja | ✅ React Navigation 7 (native-stack) | bez zmian; Expo Router do rozważenia w fazie web | patrz otwarte kwestie w [05-decyzje.md](05-decyzje.md) |
| Stan | ✅ zustand 5 + AsyncStorage (persist) | bez zmian | trwałe dane użytkownika w `profiles`, nie tylko lokalnie |
| Backend (klient) | ✅ `@react-native-firebase/*` | 📋 `@supabase/supabase-js` | sesja w AsyncStorage według przewodnika Supabase dla Expo |
| Logowanie | ✅ `@react-native-google-signin/google-signin` | bez zmian + 📋 `expo-apple-authentication` | token ID trafia do `supabase.auth.signInWithIdToken` |
| Audio | ✅ `expo-audio` | bez zmian | 📋 ustawienia nagrywania pod mowę (mono) zamiast `HIGH_QUALITY` |
| Kolejka offline | brak | 📋 `expo-sqlite` (już w zależnościach) | tabela lokalna nagrań do wysłania |
| Pliki | ✅ `expo-file-system` | bez zmian | |
| Walidacja | brak | 📋 `zod` | wspólne schematy z Edge Functions |
| Wykresy | ✅ `react-native-gifted-charts`, `react-native-svg` | bez zmian | |
| Graf | brak | 📋 `react-force-graph-2d` | na natywnych platformach przez komponenty DOM Expo (`'use dom'`) |
| Markdown | brak | 📋 renderer Markdown dla RN i web | wybór w fazie 3 |
| UI | ✅ `expo-blur`, `expo-linear-gradient`, masked-view, `@expo/vector-icons` | bez zmian | |
| Udostępnianie | ✅ `react-native-view-shot`, `expo-sharing` | bez zmian | |
| Build | ✅ EAS Build, generowanie natywnych projektów (`ios/`, `android/` w `.gitignore`) | bez zmian | natywne zmiany tylko przez wtyczki konfiguracyjne |

## Apple Watch

| Obszar | Technologia |
|---|---|
| UI | SwiftUI, watchOS 10+ (do potwierdzenia) |
| Nagrywanie | AVFoundation (`AVAudioRecorder`, AAC, mono) |
| Komunikacja z iPhone'em | WatchConnectivity (`transferFile`, `updateApplicationContext`) |
| Target w projekcie Expo | `@bacons/apple-targets`, kod w `targets/watch/` |
| Odbiór po stronie iPhone'a | lokalny moduł Expo (Expo Modules API, Swift) w `modules/watch-connectivity/` |
| Po MVP | WidgetKit (komplikacja), App Intents (Action Button), URLSession w tle (wysyłanie bezpośrednio z zegarka) |

## Backend: Supabase

| Obszar | Technologia |
|---|---|
| Baza | Postgres + rozszerzenia `vector` (pgvector), `pg_cron`, `pg_net`, `unaccent` |
| Auth | Supabase Auth, dostawcy: Google, Apple |
| Pliki | Supabase Storage, prywatne buckety `recordings`, `documents` |
| Funkcje | Edge Functions (Deno, TypeScript): `process-recording`, `build-daily`, `chat`, `delete-account` |
| Realtime | statusy nagrań i odświeżanie list |
| Narzędzia | Supabase CLI: lokalne środowisko, migracje w `supabase/migrations/`, testy funkcji `deno test` |

## Modele AI

Każde zadanie ma własną konfigurację, więc model można zmienić bez zmian w kodzie. Nazwy modeli trzeba zweryfikować u dostawcy w momencie implementacji.

| Zadanie | Domyślnie | Zmienne |
|---|---|---|
| Transkrypcja | Groq `whisper-large-v3`, język `pl` | `STT_PROVIDER`, `STT_MODEL` |
| Podział nagrania na notatki i klasyfikacja | Groq `llama-3.3-70b-versatile` | `LLM_STRUCTURE_PROVIDER`, `LLM_STRUCTURE_MODEL` |
| Wpis dnia z osobowością | Groq `llama-3.3-70b-versatile` | `LLM_DIGEST_PROVIDER`, `LLM_DIGEST_MODEL` |
| Ocena powiązań | Groq `llama-3.3-70b-versatile` | `LLM_LINK_PROVIDER`, `LLM_LINK_MODEL` |
| Czat i przepisywanie zapytań | do wyboru po testach jakości po polsku (Groq lub Gemini) | `LLM_CHAT_PROVIDER`, `LLM_CHAT_MODEL` |
| Embeddingi | Google `gemini-embedding-001`, `output_dimensionality = 1536` | `EMBED_PROVIDER`, `EMBED_MODEL`, `EMBED_DIM` |

Groq nie udostępnia embeddingów, dlatego potrzebny jest drugi dostawca. Zmiana modelu embeddingów wymaga ponownego policzenia wszystkich wektorów (kolumna `document_chunks.embedding_model`).

## Sekrety i konfiguracja

| Nazwa | Gdzie | Uwagi |
|---|---|---|
| `GROQ_API_KEY` | sekrety Supabase | ❌ dziś w `.env` jako `EXPO_PUBLIC_GROQ_API_KEY`, czyli w pakiecie aplikacji. Usunąć i unieważnić klucz |
| `GEMINI_API_KEY` | sekrety Supabase | dziś w `.env` jako `GOGLE_API` (z literówką); przenieść |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env` klienta | publiczne z założenia; bezpieczeństwo zapewnia RLS |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, iOS client ID | `.env` klienta | publiczne; iOS client ID jest dziś wpisany na stałe w `LoginScreen.tsx` |
| `SUPABASE_SERVICE_ROLE_KEY` | tylko Edge Functions (wstrzykiwany automatycznie) | nigdy w kliencie ani w repozytorium |

Zasada: przedrostek `EXPO_PUBLIC_` oznacza „trafi do pakietu aplikacji”. Nigdy nie używamy go dla sekretów.

## Narzędzia deweloperskie

| Narzędzie | Stan |
|---|---|
| Prettier, Husky, lint-staged | ✅ skonfigurowane |
| ESLint | ❌ lint-staged go wywołuje, ale nie jest zainstalowany. 📋 dodać `eslint` + `eslint-config-expo` |
| Testy | 📋 `jest-expo` dla `domain` i `application`; `deno test` dla Edge Functions |
| Sprawdzanie typów | 📋 wykluczyć `design_exports/` w `tsconfig.json` |

## Do usunięcia ❌

- `@react-native-firebase/app`, `@react-native-firebase/auth`, `@react-native-firebase/firestore`
- pliki `google-services.json` i `GoogleService-Info.plist`, wpisy `googleServicesFile` i wtyczki Firebase w `app.json`
- ustawienia `expo-build-properties` potrzebne tylko Firebase (`useFrameworks: static`, `forceStaticLinking`)
- `expo-av` (paczka i wtyczka; kod używa `expo-audio`), `drizzle-orm`, `drizzle-kit`, `groq-sdk`
- `test-metering.js`, nieużywane komponenty `RecordButton` i `DiaryEntryCard` (albo ich ponowne użycie)
- `src/infrastructure/ai/groqService.ts` w obecnej formie (logika przechodzi do Edge Functions)
