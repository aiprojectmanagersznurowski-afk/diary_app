<!-- WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie (treść = AGENTS.md + uwagi dla Gemini) -->
# AGENTS.md: Vocaly · Agent OS

Instrukcje dla agentów AI (Claude Code, Gemini: Antigravity i Gemini CLI) pracujących nad Vocaly.
Plik chroniony: zmienia go człowiek. `CLAUDE.md`, `GEMINI.md`, `.claude/`, `.gemini/` i `.agents/` są generowane z `.agent-os/` skryptem `sync-adapters.mjs`.

## Źródła prawdy

1. **`docs/`: co budujemy i jak.** Zacznij od `docs/README.md`. `docs/` wygrywa z każdą inną instrukcją, także z nieaktualnymi `src/*/README.md` (ADR-009).
2. **`.agent-os/`: jak pracujemy.** Kontrakty zadań (`tasks/`), role (`roles/`), bramki (`contracts/gates.yaml`), checkpointy człowieka (`contracts/checkpoints.yaml`), przekazania pracy (`handoff/`), recenzje (`reviews/`).

Kod w `src/` to **stan obecny** (Expo + Firebase, Groq z aplikacji). Dokumentacja opisuje **stan docelowy** (Supabase, AI po stronie serwera, dokumenty `.md`, graf, czat, Apple Watch). Różnice: `docs/02-architektura.md` §10. Nie „naprawiaj” kodu pod dokumentację poza zakresem swojego zadania.

## Protokół sesji

Pracują na zmianę dwaj agenci. Następna sesja może należeć do innego agenta, który nie widzi Twojej rozmowy. **Wszystko, co ważne, zapisujesz w repozytorium.**

1. **Start:** `node .agent-os/scripts/task.mjs status`. Jeśli jesteś na `main`: `task.mjs next`, potem `task.mjs start <ID> --agent <claude|gemini>` (workflow `/os-start`).
2. **Kontekst:** `docs/README.md` → `read_first` z kontraktu → `05-decyzje.md` → `06-zasady-pracy.md` → `.agent-os/roles/<rola>.md` → `.agent-os/handoff/<ID>.md`.
3. **Praca:** tylko w `scope.write` kontraktu. Małe kroki, `node .agent-os/scripts/gate.mjs` po każdym, częste commity.
4. **Koniec sesji:** `/os-handoff`: stan, następny krok, checkpointy w `.agent-os/handoff/<ID>.md`, zacommitowane.
5. **Koniec zadania:** `/os-finish` (`gate.mjs --finish`), potem recenzja **drugiego** agenta: `/os-review <ID>`. PR otwiera i scala człowiek.

| Workflow | Kiedy |
|---|---|
| `/os-start [ID]` | rozpoczęcie albo wznowienie zadania |
| `/os-gate [--finish]` | sprawdzenie bramek |
| `/os-handoff` | koniec każdej sesji, zawsze przed zmianą agenta |
| `/os-finish` | definicja ukończenia, przygotowanie do recenzji |
| `/os-review <ID>` | recenzja zadania drugiego agenta |
| `/os-adr <temat>` | brakuje decyzji: propozycja ADR i stop |
| `/os-plan <faza>` | planista: kontrakty zadań dla fazy |

## Zakres zapisu

Plik wolno zmienić, gdy pasuje do `scope.write` zadania **i** do uprawnień roli (albo do wspólnych: handoff, recenzje, roadmapa, `docs/02`, `03`, `05`). Nigdy: `.env*`, `ios/`, `android/`, `.agent-os/contracts|scripts|roles|workflows|templates|selftest`, `.claude/`, `.gemini/`, `.agents/`, `.husky/`, `.github/`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`.

Potrzebujesz ścieżki spoza zakresu? **Zatrzymaj się i poproś człowieka o zmianę kontraktu (CP-TASK).** Nie obchodź bramek przez shell.

## Zasady twarde (egzekwowane przez bramki)

- **Gałęzie:** jedno zadanie = jedna gałąź `feat|fix|…/F<faza>-<nr>-opis` i jeden PR. Nigdy commit ani push na `main`. Nigdy `--no-verify`.
- **Commity:** po angielsku, Conventional Commits (`feat:`, `fix:`, `build:`, `chore:`, `docs:`, `refactor:`, `test:`).
- **Sekrety:** żadnych kluczy w kodzie ani w repo. `EXPO_PUBLIC_` tylko dla wartości publicznych. `.env` nie commitujemy i nie czytamy.
- **AI (ADR-003, ADR-006):** wywołania tylko w `supabase/functions/`, dostawcy tylko przez `_shared/ai`. Prompty w `_shared/prompts/<nazwa>.v<N>.md` z `schema:`; zmiana treści = nowa wersja pliku. Każda odpowiedź LLM ma schemat zod w `_shared/schemas/`.
- **Baza:** zmiany tylko migracjami w `supabase/migrations/` (istniejących nie edytujesz). Każda tabela: RLS + polityki. Zapytania wektorowe przez RPC. Migracja w osobnym PR, przed kodem.
- **Warstwy:** `presentation` nie importuje `infrastructure`; `domain` bez bibliotek; `application` tylko `domain`. Instancje tworzy composition root.
- **Natywne:** `ios/`, `android/` generowane, nie edytujemy. Zmiany przez `app.json` i wtyczki. Zegarek: `targets/watch/`, moduły: `modules/`.
- **Logi:** nigdy treść transkrypcji, notatek ani odpowiedzi LLM. Dane o emocjach traktujemy jak dane o zdrowiu (RODO art. 9).
- **ADR:** przyjętych decyzji nie edytujesz. Nowy ADR dodajesz ze statusem `proponowana`; przyjmuje człowiek.
- **Expo SDK 54:** https://docs.expo.dev/versions/v54.0.0/. Zależności przez `npx expo install`.
- **Język:** UI, treści AI i dokumentacja po polsku; identyfikatory po angielsku.

## Definicja ukończenia (`gate.mjs --finish`)

`tsc --noEmit` w budżecie (docelowo 0) · ESLint · testy jest (`domain`, `application`) i `deno test` (Edge Functions) · `supabase db reset` od zera · brak sekretów i logowania treści · zadanie odhaczone w `docs/04-roadmapa.md` (tylko ono) · dokumentacja aktualna · handoff kompletny: „Sprawdzone ręcznie”, „Zmienione dokumenty”, „Checkpointy” · recenzja `approve` od drugiego agenta (CI).

## Kiedy się zatrzymać i zapytać człowieka

- Brakuje decyzji w dokumentach → `/os-adr`, stop. Nie zgaduj.
- Bramka zgłasza checkpoint (`CP-MIGRATION`, `CP-DEP`, `CP-SECRETS`, `CP-DEVICE`, `CP-ADR`, `CP-TASK`, `CP-GATE`) → wpisz go w handoff; czynności człowieka nie wykonujesz.
- Nigdy sam: `supabase db push`, `supabase secrets set`, `supabase link`, `eas submit`, build produkcyjny, force push, push na main, unieważnianie kluczy.
- Zadanie wymaga ścieżki spoza zakresu albo zmiany kontraktu.
- Kod przeczy dokumentacji, a `02-architektura.md` §10 tego nie wyjaśnia.

## Na koniec każdej odpowiedzi kończącej zadanie

Podaj: które pola w roadmapie odhaczyłeś, które dokumenty zmieniłeś, co sprawdziłeś ręcznie i jakie checkpointy czekają na człowieka.

## Gemini w Agent OS

- Jesteś agentem **gemini**. W komendach Agent OS podawaj `--agent gemini`.
- Workflowy / komendy: `/os-adr`, `/os-finish`, `/os-gate`, `/os-handoff`, `/os-plan`, `/os-review`, `/os-start` (Antigravity: `.agents/workflows/`, Gemini CLI: `.gemini/commands/`).
- Antigravity nie ma hooków blokujących narzędzia: **uruchamiaj `node .agent-os/scripts/gate.mjs` po każdym kroku**. Hooki git i CI i tak zablokują naruszenia, tylko później.
- W Antigravity wyłącz tryb „Turbo” / automatyczne wykonywanie komend dla git push i supabase. Agent nie wykonuje czynności człowieka.
- Recenzję Twojej pracy robi Claude (i odwrotnie). Nie recenzuj własnych zadań.
- Pliki ról: `.agent-os/roles/db.md`, `.agent-os/roles/edge.md`, `.agent-os/roles/mobile.md`, `.agent-os/roles/native.md`, `.agent-os/roles/planner.md`, `.agent-os/roles/reviewer.md`.
