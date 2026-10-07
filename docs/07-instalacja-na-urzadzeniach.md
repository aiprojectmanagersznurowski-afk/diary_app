# Instalacja Vocaly na iPhonie i Apple Watch

Jak po każdej zmianie w kodzie zainstalować aplikację na własnym iPhonie i zegarku, żeby działała bez Maca i w każdej sieci.

Aplikacja zegarka (target `.watch`) jest częścią aplikacji iOS, więc instaluje się razem z nią.

W projekcie nie ma `expo-updates`, więc **każda zmiana w kodzie wymaga nowego buildu**.

Agenci nie uruchamiają `eas build` w profilu produkcyjnym ani `eas submit` (AGENTS.md). Te komendy uruchamia człowiek.

## Co uruchomić kiedy

Większość kroków robisz tylko raz. Przy zwykłej zmianie w aplikacji wystarczy jeden build.

| Zmiana w repo | Co uruchomić |
|---|---|
| kod aplikacji (`src/`, ekrany, logika) | tylko build na telefon (Sposób A albo B) |
| `app.json`, wtyczki, zależności w `package.json`, `targets/watch/` (zegarek), ikona | `npx expo prebuild --platform ios --clean`, a potem build na telefon |
| nowa migracja w `supabase/migrations/` | `supabase db push` |
| zmiana w `supabase/functions/` | `supabase functions deploy <nazwa>` |
| zmiana wartości sekretu serwera (klucze, modele) | `supabase secrets set ...` |
| nowa zmienna `EXPO_PUBLIC_*` | `.env` (kabel) i `eas env:create` (TestFlight) |

Dla zmian w aplikacji serwera nie dotykasz, a dla zmian na serwerze nie trzeba budować aplikacji od nowa.

## Sposób A: TestFlight (bez kabla)

Ten sposób daje wersję taką jak w App Store i pozwala dać aplikację innym testerom. Trwa około 30–90 minut.

### Jednorazowo

1. Na Macu, w [App Store Connect](https://appstoreconnect.apple.com), otwórz Vocaly → TestFlight → Internal Testing. Utwórz grupę i dodaj do niej swój Apple ID. Strona nie działa dobrze w przeglądarce na iPhonie.
2. Na iPhonie zainstaluj aplikację **TestFlight** z App Store.
3. Na iPhonie otwórz aplikację Watch → Ogólne i włącz „Automatyczna instalacja aplikacji”.
4. Zmienne `EXPO_PUBLIC_*` muszą być ustawione w EAS, bo `.env` nie trafia do buildu EAS. Sprawdzisz je komendą:
   ```bash
   eas env:list --environment production
   ```
   Brakującą zmienną dodasz tak:
   ```bash
   eas env:create --environment production --name <NAZWA> --value "<wartość>" --visibility plaintext
   ```

### Po każdej zmianie

```bash
cd ~/Developemnt/diary/diary-app
git switch main && git pull
npm run preflight -- --eas --live
eas build -p ios --profile production --auto-submit
```

Krok `preflight` sprawdza w kilka sekund zmienne z EAS (teksty zastępcze, format adresu i klucza Supabase, identyfikatory Google) i to, czy Supabase ma włączone logowanie Apple i Google. Przy błędzie nie uruchamiaj buildu: popraw zmienne komendą `eas env:create --force --environment production --environment preview --environment development ...`. Ta sama kontrola działa też automatycznie na serwerze EAS (`eas-build-pre-install` i `expo prebuild`) i przerywa build z listą problemów. Zmienne muszą być ustawione we wszystkich środowiskach, których używasz (production, preview, development). Pominięcie kontroli: `SKIP_PREFLIGHT=1` (tylko awaryjnie).

1. Poczekaj na powiadomienie z TestFlight. Kolejka EAS w darmowym planie i przetwarzanie u Apple trwają razem 30–90 minut. Status sprawdzisz na expo.dev → projekt diary-app → Builds lub Submissions.
2. W aplikacji TestFlight na iPhonie kliknij **Aktualizuj**.
3. Zegarek zaktualizuje się sam. Jeśli nie, otwórz aplikację Watch → Vocaly → Zainstaluj.

Numer buildu zwiększa się automatycznie (`autoIncrement` w `eas.json`).

## Sposób B: kablem (szybki, około 5–10 minut)

Ten sposób najlepiej sprawdza się przy codziennym testowaniu zmian.

### Jednorazowo

1. Na iPhonie włącz Ustawienia → Prywatność i bezpieczeństwo → **Tryb programisty**. Wymaga to restartu telefonu.
2. W Xcode otwórz `ios/diaryapp.xcworkspace`. W zakładce Signing & Capabilities ustaw swój Team dla targetu aplikacji i dla targetu zegarka.
3. Po pierwszej instalacji na iPhonie otwórz Ustawienia → Ogólne → VPN i zarządzanie urządzeniem, wybierz swoje konto i kliknij „Ufaj”.

### Po każdej zmianie

1. Podłącz iPhone'a kablem i odblokuj go.
2. Uruchom:
   ```bash
   cd ~/Developemnt/diary/diary-app
   npx expo run:ios --device --configuration Release
   ```
   Wybierz swój iPhone z listy.
3. Odłącz kabel. Dzięki `--configuration Release` kod JS jest wbudowany w aplikację, więc działa ona bez Maca i Metro.
4. Jeśli zegarek się nie zaktualizuje, otwórz aplikację Watch na iPhonie → Vocaly → Zainstaluj.

Build podpisany płatnym kontem Apple Developer działa do roku. Kolejna instalacja kablem zastępuje poprzednią.

Przy zwykłej zmianie kodu wystarczy ta jedna komenda. `prebuild --clean` i `pod install` są potrzebne tylko w przypadkach z tabeli „Co uruchomić kiedy”. Przed buildem zrób `git switch main && git pull`.

Wygenerowany folder `targets/watch/Assets.xcassets/` pojawia się po każdym prebuildzie. Nie commituj go.

## Android (APK do testów)

Zakres pierwszej wersji: tylko APK z profilu `preview`, bez Google Play (zadanie F9-05).

### Jednorazowo

1. W Google Cloud Console → Credentials utwórz klienta OAuth typu **Android**: pakiet `com.michal.sznurowski.diaryapp`, SHA-1 z `eas credentials -p android`.
2. W `eas.json` w profilu `preview` dodaj `"android": { "buildType": "apk" }`.
3. W Supabase → Authentication → Providers włącz Google (te same identyfikatory klienta co na iOS).

### Build i instalacja

```bash
npm run preflight -- --eas --live
eas build -p android --profile preview
```

Po buildzie otwórz link z EAS na telefonie i zainstaluj APK. Sprawdź: logowanie Google, zgodę na mikrofon (tekst po polsku), nagranie i wysyłkę do kolejki.

## Zmienne środowiskowe

| Sposób | Skąd biorą się `EXPO_PUBLIC_*` |
|---|---|
| A (EAS / TestFlight) | środowisko EAS (`eas env:list`) |
| B (kabel) | lokalny `.env` |

Nową zmienną `EXPO_PUBLIC_*` dodaj w obu miejscach.

Jeśli zmiennych brakuje albo mają tekst zastępczy, aplikacja pokazuje ekran „Błąd konfiguracji” z listą problemów (bez wartości), a build z taką konfiguracją przerywa kontrola preflight.

## Serwer Supabase (jednorazowo)

Bez tego nagranie wysyła się z telefonu, ale notatki i wpis dnia się nie pojawiają, a nagrania wiszą na statusie „Wysłane”. Dotyczy projektu, do którego łączy się aplikacja. Agenci tych komend nie uruchamiają (AGENTS.md).

1. W katalogu repo:
   ```bash
   supabase db push
   supabase secrets set LLM_STRUCTURE_MODEL=openai/gpt-oss-120b LLM_DIGEST_MODEL=openai/gpt-oss-120b LLM_LINK_MODEL=openai/gpt-oss-120b LLM_CHAT_MODEL=openai/gpt-oss-120b
   supabase functions deploy process-recording build-daily chat
   ```
2. Skopiuj klucz `service_role`: Supabase Dashboard → Project Settings → API Keys → Legacy API Keys → `service_role` → Reveal. Klucz daje pełny dostęp do bazy, więc nie wklejaj go do czatu ani do repo.
3. W Dashboard → SQL Editor → New query wklej poniższy SQL i uruchom (Run). Zamień `<PROJECT_REF>` na identyfikator projektu (widać go w adresie Dashboardu i w `supabase/.temp/project-ref`), a `<SERVICE_ROLE_KEY>` na skopiowany klucz:
   ```sql
   select vault.create_secret('https://<PROJECT_REF>.supabase.co/functions/v1/process-recording', 'process_recording_url');
   select vault.create_secret('<SERVICE_ROLE_KEY>', 'process_recording_auth');
   select vault.create_secret('https://<PROJECT_REF>.supabase.co/functions/v1/build-daily', 'build_daily_url');
   select vault.create_secret('<SERVICE_ROLE_KEY>', 'build_daily_auth');
   ```
4. Sprawdź, że wpisy istnieją (zapytanie pokazuje tylko nazwy):
   ```sql
   select name from vault.secrets order by name;
   ```
   Powinny być 4 nazwy: `build_daily_auth`, `build_daily_url`, `process_recording_auth`, `process_recording_url`.
5. Zawieszone nagrania cron ponawia co 5 minut, a wpis dnia buduje się w następnym cyklu. Notatki powinny pojawić się w ciągu kilku minut.

Wpisy w Vault dodaj po `supabase functions deploy`, bo adresy wskazują na wdrożone funkcje.

Błąd `duplicate key ... secrets_name_idx` oznacza, że wpis już istnieje. Zaktualizuj go: `select vault.update_secret(id, '<SERVICE_ROLE_KEY>') from vault.secrets where name = 'process_recording_auth';` (analogicznie dla `build_daily_auth`).

## Typowe problemy

| Objaw | Przyczyna | Co zrobić |
|---|---|---|
| „Network request failed” przy logowaniu | brak `EXPO_PUBLIC_SUPABASE_*` w buildzie | dodaj zmienne w EAS i zbuduj aplikację od nowa |
| „waiting for an available submitter” przez długi czas | kolejka darmowego planu EAS | poczekaj albo użyj sposobu B |
| Błąd podpisywania przy `expo run:ios` | brak Teamu w Xcode | ustaw Team dla aplikacji i zegarka (Signing & Capabilities) |
| Aplikacja nie uruchamia się po instalacji kablem | brak zaufania do dewelopera | Ustawienia → Ogólne → VPN i zarządzanie urządzeniem → Ufaj |
| Brak Vocaly na zegarku | wyłączona automatyczna instalacja | aplikacja Watch → Vocaly → Zainstaluj |
| Nagrania wiszą na „Wysłane”, brak notatek | serwer niewdrożony albo brak wpisów w Vault | wykonaj sekcję „Serwer Supabase (jednorazowo)” |
| `pod install` kończy się błędem `Unicode Normalization not appropriate for ASCII-8BIT` | terminal bez kodowania UTF-8 | dodaj `export LANG=en_US.UTF-8` do `~/.zprofile` i otwórz nowe okno terminala |
| `git push` odrzucony przez hook: „praca bezpośrednio na 'main'” | push wykonany ze stojąc na `main` | przełącz się na gałąź zadania (`git switch <gałąź>`) przed `git push` |
