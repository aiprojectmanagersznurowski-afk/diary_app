# Przekazanie pracy: Claude → Gemini (2026-10-07)

Plik sesyjny (nie jest handoffem zadania). Czytaj go razem z `AGENTS.md`, `GEMINI.md`, `docs/README.md` i `docs/04-roadmapa.md`.
Użytkownik pisze po polsku i oczekuje polskich odpowiedzi; „kontynuuj” = rób dalej samodzielnie wg pętli zadań.

## 1. Gdzie jesteśmy

| Obszar | Stan |
|---|---|
| Faza 8 (nowy design) | F8-01, F8-02 zrobione i scalone. **F8-03 w toku (WIP w stashu)**, F8-04..F8-07 do zrobienia |
| Faza 9 (stabilność) | F9-01 (#71) i F9-02 (#73) scalone. **F9-03 gotowe, PR #75 czeka na scalenie** (recenzja Opusa: po poprawkach approve). F9-04 (Sentry) i F9-05 (Android) mają kontrakty, nie zaczęte |
| Faza 7 (web) | F7-01 scalone, F7-02 (bundle bez expo-sqlite) do zrobienia |
| F2-09 | Gałąź lokalna `chore/F2-09-groq-default-model` jest przebazowana na `main`; wymaga force pushu **przez człowieka** (PR #53) |
| Trello/Drive | Karty F9-01..F9-05 aktualne (stan na 2026-10-07). Plik statusu na Drive do odświeżenia po następnym kroku |

Przyczyna całej Fazy 9: logowanie na TestFlight padało z „Invalid API key”, bo zmienne `EXPO_PUBLIC_*` na EAS miały teksty zastępcze (`<anon key z .env>`). Teraz aplikacja pokazuje ekran „Błąd konfiguracji”, a build jest blokowany przez preflight (`npm run preflight`, plugin `withEnvValidation`, hak `eas-build-pre-install`). Audyt: `docs/09-audyt-gotowosci.md`.

## 2. Co robisz teraz (kolejność)

1. **Formalna recenzja F9-01, F9-02, F9-03 (to jest Twoja rola).** Reguła projektu: recenzję robi drugi agent. Pliki `.agent-os/reviews/F9-0{1,2,3}.md` powstały z recenzji subagentów Claude'a (model Opus); potraktuj je jako wstępne i wystaw własne `/os-review F9-0X` (CI wymaga `approve` od drugiego agenta). Zacznij od F9-03 (PR #75, otwarty), potem F9-01 i F9-02 (już scalone: recenzja wsteczna, ewentualne uwagi jako zadanie naprawcze).
2. **Wznów F8-03** (`feat/F8-03-detail-screens`): stash `stash@{0}` „f803-wip2” zawiera prace (komponenty `src/presentation/components/detail/*`: `DailyDetail`, `NoteDetail`, `SectionCard`, `StoryPreview`, `MarkdownSheet`, `DetailTopBar`, przepisane `RelatedThoughtsSection`, `detailLogic.ts` + testy, nowy `DetailScreen.tsx`, teksty `pl.detail`). Zostało: dokończyć testy, uzupełnić handoff, bramki, PR, recenzja. Przed `git stash pop` upewnij się, że jesteś na gałęzi F8-03 przebazowanej na aktualny `main`. **Nie ruszaj** `stash@{1}` ani `stash@{2}` (stare stashe użytkownika).
3. Dalej wg `task.mjs next`: F8-04 (Analizy, Osiągnięcia, Ustawienia), F8-05 (graf), F8-06 (czat), F8-07 (watchOS, rola native), F7-02, F9-05 (po krokach człowieka), F9-04 (po akceptacji ADR-010 i zgodzie na zależność).
4. Po każdym większym kroku: karty Trello + roadmapa + plik statusu na Drive (patrz pkt 5).

## 3. Czynności tylko dla człowieka (nie rób ich)

- Scalenie PR z `--admin` (CI `selftest` jest czerwony od dawna; to znany stan): teraz #75; później kolejne PR-y.
- Force push gałęzi `chore/F2-09-groq-default-model` i scalenie #53.
- Akceptacja ADR-010 (Sentry, status „proponowana”) i zależności `@sentry/react-native` (CP-ADR, CP-DEP).
- Kroki z `docs/09` §4 (karty AUDYT-1..9 w Trello): dostawcy Apple i Google w Supabase, Vault, klient OAuth Android + SHA-1, `buildType: apk` w `eas.json`, nazwa w App Store Connect, poprawa zmiennych EAS (`eas env:create --force --environment production --environment preview --environment development`).
- Buildy EAS, `eas submit`, testy na urządzeniu (CP-DEVICE).
- Nigdy sam: `supabase db push`, `supabase secrets set`, `supabase link`, `eas submit`, build produkcyjny, force push, push na `main`, `--no-verify`, unieważnianie kluczy.

## 4. Pułapki, które już nas kosztowały

- **Nieśledzone pliki blokują `task.mjs start`** („masz niezacommitowane zmiany”). `deno.lock` (generuje deno-test) i `targets/watch/Assets.xcassets/` (nie nasze) są dopisane do `.git/info/exclude`. Nie commituj ich.
- **Branch musi pasować do kontraktu** (`branch:` w `.agent-os/tasks/<ID>.yaml`); dla pracy planisty (docs/kontrakty) używaj gałęzi bez ID zadania, np. `docs/plan-…`.
- **Bramka `scope`** blokuje pliki poza `scope.write` i uprawnieniami roli; nie omijaj jej przez shell. Potrzebujesz innej ścieżki: CP-TASK i stop.
- **Bramka `secrets`** zgłasza nazwy typu `service_role` i `EXPO_PUBLIC_*API_KEY` nawet w komunikatach. Nie zaciemniaj kodu, ogranicz walidator/teksty (tak zrobiono w F9-01; klucz Groq w aplikacji to BEZP-1).
- **Sekrety:** `.env` nie czytamy i nie commitujemy. `TRELLO_API`/`TRELLO_TOKEN` są w `.env` i ładuje je wyłącznie skrypt (`process.loadEnvFile`), bez wypisywania.
- **Hak `eas-build-pre-install` działa przed instalacją zależności**: `plugins/preflight/cli.js` może używać tylko wbudowanych modułów Node (regresja złapana w recenzji F9-03).
- **Testy jest (react-native):** `react-test-renderer` z unmountem w `afterEach`; mocki AsyncStorage, expo-blur, linear-gradient, masked-view, vector-icons, safe-area, `react-native-gifted-charts`; bez `jest.isolateModules` dla komponentów React; testy niezależne od strefy czasowej; `process.env` przywracaj per klucz, nie podmieniaj obiektu.
- **Metro/EAS lokalnie:** cache Metro jest współdzielony między katalogami: przy weryfikacji na czystej kopii używaj osobnego `TMPDIR` albo `--reset-cache`. Bundle web wymaga `react-native-web`, `react-dom`, `@expo/metro-runtime` (są w `main`).
- **Merge/rebase:** konflikty w `docs/04-roadmapa.md` rozwiązuj ręcznie, zachowując oba odhaczenia. Bez force pushu; hak blokuje push z `main`.
- **Design:** źródło to `docs/08-design-ui.md` i `docs/design/`; brief w `/Users/michalsznurowski/Developemnt/diary/UI/VOCALY_UI_BRIEF.md`, makiety w `/Users/michalsznurowski/Developemnt/diary/UI`. Zero zahardkodowanych kolorów poza semantycznymi; teksty tylko przez `i18n/pl.ts`.

## 5. Narzędzia i status

- **Trello:** tablica https://trello.com/b/hdHfuhyw/vocaly (listy: Backlog, Do zrobienia, W trakcie, Review / CP-DEVICE, Gotowe; karty `[F9-03] tytuł`). Skrypty pomocnicze: `/private/tmp/claude-501/-Users-michalsznurowski-Developemnt-diary/c04a6bdd-ddd7-4e88-a49b-1385adb53135/scratchpad/` (`trello.mjs`, `trello-list.mjs`, `trello-sync2.mjs` jako wzór: `move(tag, lista, komentarz)` i `create(...)`). Jeśli skryptów nie widzisz, użyj REST API Trello z kluczem/tokenem ładowanym z `.env` wewnątrz skryptu.
- **Status na Google Drive:** folder „Status wdrożeń” (id `1E1YxPtEOZHdEnTToa7T1gdtzzGl4AFjw`), plik `status-vocaly.md`. Konektor nie nadpisuje treści: zmień nazwę starego na `status-vocaly-<data>.md` i utwórz nowy `status-vocaly.md`. Format: front matter YAML (`project_name`, `trello_board_url`, `last_updated`, `status`, `progress_pct`, `progress_last_week_pct`, `eta_remaining`, `git_branch`, `requires_user_action`, `daily_history`) + sekcje: Wymagane działania człowieka, Blokery i Ryzyka, Ostatnio zrobione, Rekomendowana sekwencja zadań, Ważne decyzje. `progress_pct` = odhaczone / wszystkie pozycje roadmapy.
- **Pamięć Claude'a:** `/Users/michalsznurowski/.claude/projects/-Users-michalsznurowski-Developemnt-diary/memory/` (`vocaly-project-tracking.md`, `second-brain-decisions.md`) jako dodatkowy kontekst.
- **Pełny transcript poprzedniej sesji:** `/Users/michalsznurowski/.claude/projects/-Users-michalsznurowski-Developemnt-diary/c04a6bdd-ddd7-4e88-a49b-1385adb53135.jsonl` (duży; czytaj fragmentami przez grep).

## 6. Procedura na każde zadanie (skrót)

`node .agent-os/scripts/task.mjs status` → `next` → `start <ID> --agent gemini` → czytaj `read_first` i rolę → małe kroki + `node .agent-os/scripts/gate.mjs` → `/os-handoff` (sekcje „Sprawdzone ręcznie”, „Zmienione dokumenty”, „Checkpointy” kompletne) → odhacz **tylko swoją** pozycję w roadmapie → `gate.mjs --finish` → push → PR (commity po angielsku, Conventional Commits, końcówka `Co-Authored-By` wg ustawień sesji) → recenzja **drugiego** agenta (Claude) → człowiek scala. Na koniec odpowiedzi: które pola roadmapy odhaczone, jakie dokumenty zmienione, co sprawdzone ręcznie, jakie checkpointy czekają.
