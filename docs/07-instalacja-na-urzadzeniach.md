# Instalacja Vocaly na iPhonie i Apple Watch

Jak po każdej zmianie w kodzie zainstalować aplikację na własnym iPhonie i zegarku, żeby działała bez Maca i w każdej sieci.

Aplikacja zegarka (target `.watch`) jest częścią aplikacji iOS, więc instaluje się razem z nią.

W projekcie nie ma `expo-updates`, więc **każda zmiana w kodzie wymaga nowego buildu**.

Agenci nie uruchamiają `eas build` w profilu produkcyjnym ani `eas submit` (AGENTS.md). Te komendy uruchamia człowiek.

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
eas build -p ios --profile production --auto-submit
```

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

## Zmienne środowiskowe

| Sposób | Skąd biorą się `EXPO_PUBLIC_*` |
|---|---|
| A (EAS / TestFlight) | środowisko EAS (`eas env:list`) |
| B (kabel) | lokalny `.env` |

Nową zmienną `EXPO_PUBLIC_*` dodaj w obu miejscach.

Jeśli zmiennych brakuje, aplikacja łączy się z `placeholder.supabase.co`, a logowanie kończy się błędem „Network request failed”.

## Typowe problemy

| Objaw | Przyczyna | Co zrobić |
|---|---|---|
| „Network request failed” przy logowaniu | brak `EXPO_PUBLIC_SUPABASE_*` w buildzie | dodaj zmienne w EAS i zbuduj aplikację od nowa |
| „waiting for an available submitter” przez długi czas | kolejka darmowego planu EAS | poczekaj albo użyj sposobu B |
| Błąd podpisywania przy `expo run:ios` | brak Teamu w Xcode | ustaw Team dla aplikacji i zegarka (Signing & Capabilities) |
| Aplikacja nie uruchamia się po instalacji kablem | brak zaufania do dewelopera | Ustawienia → Ogólne → VPN i zarządzanie urządzeniem → Ufaj |
| Brak Vocaly na zegarku | wyłączona automatyczna instalacja | aplikacja Watch → Vocaly → Zainstaluj |
