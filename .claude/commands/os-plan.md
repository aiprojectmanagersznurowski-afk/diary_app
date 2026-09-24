---
description: "Rozpisz fazę roadmapy Vocaly na kontrakty zadań (rola planisty)"
argument-hint: "<numer fazy, np. 3>"
---
<!-- WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie -->
Działasz jako **planista** (`.agent-os/roles/planner.md`) dla fazy `$ARGUMENTS`.

1. Utwórz gałąź `docs/plan-phase-$ARGUMENTS` z aktualnego main.
2. Przeczytaj `docs/04-roadmapa.md` (faza $ARGUMENTS), `docs/02-architektura.md`, `docs/05-decyzje.md`, istniejące kontrakty w `.agent-os/tasks/` i szablon `.agent-os/templates/task.yaml`.
3. Dla każdej pozycji fazy utwórz `.agent-os/tasks/F$ARGUMENTS-NN.yaml` (NN zgodnie z kolejnością pozycji w roadmapie). Zasady z pliku roli: jedna rola, wąski scope, mierzalne kryteria, migracje osobno i wcześniej.
4. Uruchom `node .agent-os/scripts/gate.mjs`: bramka `contracts` sprawdzi pola, role, zależności i zgodność z roadmapą.
5. W podsumowaniu dla użytkownika pokaż tabelę: ID, rola, zależności, scope.write. To jest **CP-TASK**: człowiek zatwierdza przed startem.
