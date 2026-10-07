# Audyt gotowości do wydania (2026-10-07)

Audyt po nieudanym logowaniu (Apple: „Invalid API key”, Google: błąd i crash) w buildzie TestFlight. Dotyczy iPhone'a i Androida. Wnioski przekładają się na Fazę 9 w [04-roadmapa.md](04-roadmapa.md).

## 1. Przyczyna zgłoszonych błędów

**Zmienne `EXPO_PUBLIC_*` na EAS (środowisko `production`) mają zapisane teksty zastępcze zamiast wartości:**

```
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key z .env>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<z .env>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<z .env>
```

Wzięły się z przykładowych komend z nawiasami `<…>`, które wklejono dosłownie. Skutki:

- Apple: `signInWithIdToken` trafia do Supabase z kluczem `<anon key z .env>`, więc serwer odpowiada „Invalid API key”.
- Google: `GoogleSignin.configure` dostaje nieprawidłowe identyfikatory klienta. Natywny SDK może się wtedy wysypać (zgłoszony crash).
- Aplikacja nic nie sygnalizowała: kod przyjmuje każdą wartość, a przy braku zmiennych podstawia `placeholder.supabase.co` i `placeholder-anon-key`.

Poprzednie błędne buildy mają tę samą klasę przyczyn: EAS buduje z dysku i z zmiennych środowiska EAS, a nie z `.env` ani z `main`, więc rozjazd między tym, co działa lokalnie, a tym, co trafia do buildu, nie jest widoczny do czasu uruchomienia na telefonie.

## 2. Ustalenia

| # | Ważność | Ustalenie | Co robimy |
|---|---|---|---|
| 1 | krytyczne | Zmienne EAS `production` zawierają teksty zastępcze (patrz wyżej) | Człowiek: poprawia wartości (`eas env:create --force`). Zadania F9-01/F9-02 zapobiegają powtórce |
| 2 | krytyczne | Kod podstawia `placeholder.supabase.co` / `placeholder-anon-key` przy braku zmiennych (`supabaseClient.ts`, `supabaseChatRepository.ts`) | F9-01: konfiguracja walidowana przy starcie, ekran błędu konfiguracji zamiast cichych wartości zastępczych |
| 3 | wysokie | `GoogleSignin.configure` jest wywoływane na poziomie modułu z dowolną wartością (nawet `undefined` lub tekstem zastępczym) | F9-01: konfigurowanie tylko przy poprawnych identyfikatorach |
| 4 | wysokie | Brak `ErrorBoundary` i globalnego handlera błędów JS: wyjątek w renderze kończy się białym ekranem lub crashem | F9-01 |
| 5 | wysokie | Brak kontroli konfiguracji przed buildem: zły build wychodzi po 30–90 min kolejki EAS i dopiero na telefonie | F9-02: preflight w `prebuild` (EAS), `npm run preflight` i hak `eas-build-pre-install` |
| 6 | średnie | Środowiska EAS `preview` i `development` nie mają żadnych zmiennych | Człowiek: te same zmienne we wszystkich środowiskach (komenda w §4) |
| 7 | średnie | `NSMicrophoneUsageDescription` po angielsku i ze starą nazwą („Voice-to-Diary needs…”) | F9-02: polski tekst z nazwą Vocaly |
| 8 | średnie | `userInterfaceStyle: light` wymusza jasne elementy systemowe (alerty, klawiatura, arkusze) przy ciemnym motywie aplikacji | F9-02: `automatic` |
| 9 | średnie | Brak raportowania awarii: o crashu wiemy tylko z zrzutu ekranu | Decyzja produktowa (§5): Sentry wymaga nowej zależności natywnej (CP-DEP). Do tego czasu: TestFlight → Crashes w App Store Connect i Xcode → Window → Devices and Simulators → View Device Logs |
| 10 | średnie | Android: `eas.json` nie ma konfiguracji (np. `buildType: apk` dla profilu `preview`), brak klienta OAuth Android w Google Cloud | Człowiek (§4) |
| 11 | niskie | Nazwa w App Store Connect nadal „diary-app” | Człowiek: App Information → Name |
| 12 | niskie | Brak `aps-environment`/powiadomień i `UIBackgroundModes`: nagrywanie działa tylko na pierwszym planie | Świadomie poza zakresem pierwszej wersji |

## 3. Co jest w porządku (sprawdzone)

- iOS: Bundle ID `com.michal.sznurowski.diary-app`, Team ID, schemat URL Google (`iosUrlScheme`), ikona 1024 bez alfa (aplikacja i zegarek), nazwa wyświetlana „Vocaly”, `ITSAppUsesNonExemptEncryption: false`.
- Serwer Supabase: 11/11 migracji, funkcje `process-recording`, `build-daily`, `chat` aktywne (`verify_jwt: true`), sekrety modeli i kluczy ustawione, modele Groq zgodne z dostępnością.
- Android: `package` (`com.michal.sznurowski.diaryapp`), ikona adaptacyjna, uprawnienia `RECORD_AUDIO` i `MODIFY_AUDIO_SETTINGS`. Logowanie Apple jest poprawnie ukryte poza iOS.
- Bundle JS buduje się na czystej instalacji (po scaleniu zależności webowych F7-01).

## 4. Kroki człowieka (nie zadania agentów)

1. **Popraw zmienne EAS** (wartości z lokalnego `.env`, bez wypisywania ich na ekran; `--environment` podane trzykrotnie ustawia zmienną we wszystkich środowiskach):

   ```bash
   cd ~/Developemnt/diary/diary-app
   for NAME in EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID EXPO_PUBLIC_GROQ_API_KEY; do
     VALUE="$(grep "^${NAME}=" .env | cut -d= -f2-)"
     eas env:create --force --non-interactive --name "$NAME" --value "$VALUE" --visibility plaintext \
       --environment production --environment preview --environment development
   done
   eas env:list --environment production | sed -E 's/(eyJ[A-Za-z0-9_-]{8})[A-Za-z0-9_.-]+/\1…/'
   ```

   W wyniku nie może być żadnego `<…>`.
2. **Supabase → Authentication → Providers:** Google włączony, a w „Authorized Client IDs” są identyfikatory web i iOS (po przecinku). Apple włączony z Bundle ID aplikacji.
3. **Google Cloud → Credentials:** klient iOS ma Bundle ID `com.michal.sznurowski.diary-app`. Dla Androida utwórz klienta typu „Android” z pakietem `com.michal.sznurowski.diaryapp` i odciskiem SHA-1 klucza EAS (`eas credentials -p android` → Keystore → SHA-1). Bez tego Google na Androidzie zwraca `DEVELOPER_ERROR`.
4. **Android do testów:** w `eas.json` profil `preview` potrzebuje `"android": { "buildType": "apk" }`, żeby powstał plik do instalacji bez Google Play. (`eas.json` jest poza uprawnieniami agentów.)
5. **App Store Connect:** nazwa aplikacji „Vocaly”.
6. **Vault:** `select name from vault.secrets order by name;` zwraca `build_daily_auth`, `build_daily_url`, `process_recording_auth`, `process_recording_url`.

## 5. Decyzje do podjęcia

- **Raportowanie awarii (Sentry).** Zalecane, ale to nowa zależność natywna i konto z DSN (CP-DEP). Bez niego crash jest widoczny tylko w TestFlight/Xcode.
- **Zakres Androida w pierwszej wersji.** Kod i konfiguracja Androida istnieją, ale nie były budowane ani testowane. Zalecenie: build `preview` (APK) po kroku 3 z §4, test logowania Google i nagrywania, dopiero potem decyzja o Google Play.

## 6. Zapobieganie powtórkom (Faza 9)

1. **W aplikacji (F9-01):** konfiguracja walidowana przy starcie; przy błędzie ekran „Błąd konfiguracji” z listą problemów zamiast cichych adresów zastępczych; `ErrorBoundary` i globalny handler błędów.
2. **Przed buildem (F9-02):** `npm run preflight` sprawdza wartości lokalne i opcjonalnie z EAS (`--eas`); ten sam walidator uruchamia się automatycznie w `prebuild` na EAS i przerywa build po kilku minutach z czytelnym komunikatem. Walidator wykrywa teksty zastępcze, zły format adresu i klucza (JWT `anon` dla właściwego projektu), identyfikatory Google (format, zgodność z `iosUrlScheme`) oraz, z przełącznikiem `--live`, czy Supabase odpowiada i ma włączonych dostawców Apple i Google.
3. **Procedura:** przed każdym `eas build` produkcyjnym: `git switch main && git pull`, `npm run preflight -- --eas --live`. Opisane w [07-instalacja-na-urzadzeniach.md](07-instalacja-na-urzadzeniach.md).
