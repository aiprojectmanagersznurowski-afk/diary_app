# Agent OS: Vocaly

System pracy zespołu agentów (Claude Code i Gemini) nad Vocaly, w metodyce **CDAL (Contract-Driven Agentic Loop)**:
kontrakty czytelne dla maszyn → zakres zapisu per rola i zadanie → bramki z testami mutacyjnymi → checkpointy człowieka → recenzja krzyżowa.

```
docs/04-roadmapa.md ──/os-plan──▶ .agent-os/tasks/F?-??.yaml ──CP-TASK (człowiek)──▶
  /os-start (agent A) ──▶ praca w scope.write ──gate.mjs──▶ /os-handoff ◀──▶ /os-start (agent B wznawia)
  ──▶ /os-finish (gate --finish) ──▶ /os-review (drugi agent) ──▶ PR ──CI: gate --pr──▶ człowiek scala
```

## Struktura

| Ścieżka | Co | Kto zmienia |
|---|---|---|
| `contracts/roles.yaml` | role i ich uprawnienia zapisu, ścieżki chronione | człowiek |
| `contracts/gates.yaml` | konfiguracja bramek i definicji ukończenia | człowiek |
| `contracts/checkpoints.yaml` | checkpointy człowieka, komendy zakazane dla agentów | człowiek |
| `tasks/*.yaml` | kontrakty zadań (zakres, kryteria, zależności) | planista (agent) + zatwierdza człowiek |
| `roles/*.md` | instrukcje ról: planner, db, edge, mobile, native, reviewer | człowiek |
| `workflows/*.md` | źródło komend `/os-*` dla obu agentów | człowiek |
| `handoff/<ID>.md` | stan zadania i przekazanie między sesjami/agentami | agenci |
| `reviews/<ID>.md` | recenzja drugiego agenta | agent recenzent |
| `scripts/` | `gate.mjs`, `task.mjs`, hooki, `sync-adapters.mjs`, `install-hooks.mjs` | człowiek |
| `selftest/` | testy bramek i testy mutacyjne | człowiek |

Zero zależności npm: tylko Node.js 20+ i git.

## Bramki

| Bramka | Pilnuje | Kiedy |
|---|---|---|
| `branch` | brak pracy na main, nazwa gałęzi, kontrakt zadania istnieje | zawsze |
| `scope` | plik ∈ `scope.write` zadania ∩ uprawnienia roli; ścieżki chronione | zawsze |
| `secrets` | klucze, JWT, `.env`, `EXPO_PUBLIC_*` dla sekretów, `service_role` w kliencie | zawsze |
| `ai-boundary` | brak SDK/hostów AI w kliencie; w funkcjach tylko przez `_shared/ai` | zawsze |
| `layers` | warstwy `src/` (dodane linie) | zawsze |
| `native` | `ios/`, `android/` | zawsze |
| `migrations` | RLS + polityki dla każdej tabeli, niezmienność migracji, nazwa, osobny PR | zawsze |
| `prompts` | niezmienność opublikowanych promptów, `schema:` + plik zod | zawsze |
| `logging` | brak logowania transkrypcji, notatek, odpowiedzi LLM | zawsze |
| `adr` | ADR tylko dopisywane, ciągła numeracja, agent tylko „proponowana” | zawsze |
| `contracts` | poprawność kontraktów zadań i zgodność z roadmapą | zawsze |
| `checkpoints` | wykrywa CP-MIGRATION, CP-DEP, CP-SECRETS, CP-DEVICE, CP-ADR, CP-TASK, CP-GATE | zawsze |
| `roadmap` | zadanie odhaczone, żadne inne | `--finish` |
| `handoff` | kompletny handoff, wszystkie checkpointy zgłoszone | `--finish` |
| `tests-present` | zmieniona logika ma zmienione testy | `--finish` |
| `dod:*` | `tsc` (budżet błędów), ESLint, jest, `deno test`, `supabase db reset`, `supabase test db` | `--finish` |
| `review` | recenzja `approve` od **drugiego** agenta | `--pr` (CI) |
| `commits` | Conventional Commits po angielsku dla wszystkich commitów PR | `--pr` (CI) |

Bramki sprawdzają **dodane linie**, nie cały plik: istniejący dług (np. import w `OnboardingScreen`) nie blokuje zadań, które go nie dotyczą.

## Gdzie działa egzekwowanie

| Warstwa | Claude Code | Gemini CLI | Antigravity |
|---|---|---|---|
| Instrukcje | `CLAUDE.md` → `AGENTS.md` | `GEMINI.md` | `GEMINI.md`, `.agents/rules/` |
| Komendy `/os-*` | `.claude/commands/` | `.gemini/commands/` | `.agents/workflows/` |
| Blokada przed zapisem | hook `PreToolUse` | hook `BeforeTool` | brak (tylko instrukcje) |
| Kontrola na koniec tury | hook `Stop` | brak | brak |
| Hooki git (pre-commit, commit-msg, pre-push) | tak | tak | tak |
| CI (`--pr`) + ochrona main | tak | tak | tak |

## Komendy

```bash
node .agent-os/scripts/task.mjs list | next | show <ID> | status
node .agent-os/scripts/task.mjs start <ID> --agent claude|gemini
node .agent-os/scripts/task.mjs handoff --agent claude|gemini
node .agent-os/scripts/gate.mjs [--staged | --base [ref]] [--finish] [--pr] [--no-dod] [--only a,b] [--json]
node .agent-os/scripts/sync-adapters.mjs [--check]
node .agent-os/selftest/run.mjs [--mutate]
```

## Człowiek

- Lokalnie: `AGENT_OS_HUMAN=1 git commit …` zdejmuje blokadę ścieżek chronionych i akceptacji ADR (hooki agentów blokują tę zmienną u agentów).
- W CI: etykieta PR `agent-os:human-approved`.
- Po zmianie `workflows/`, `roles/` albo `AGENTS.md`: `node .agent-os/scripts/sync-adapters.mjs`.
- Po zmianie `gates.yaml` albo skryptów: `node .agent-os/selftest/run.mjs --mutate`.
