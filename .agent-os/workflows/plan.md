---
name: plan
description: Rozpisz fazę roadmapy Vocaly na kontrakty zadań (rola planisty)
argument_hint: "<numer fazy, np. 3>"
---
Działasz jako **planista** (`.agent-os/roles/planner.md`) dla fazy `{{ARGS}}`.

1. Utwórz gałąź `docs/plan-phase-{{ARGS}}` z aktualnego main.
2. Przeczytaj `docs/04-roadmapa.md` (faza {{ARGS}}), `docs/02-architektura.md`, `docs/05-decyzje.md`, istniejące kontrakty w `.agent-os/tasks/` i szablon `.agent-os/templates/task.yaml`.
3. Dla każdej pozycji fazy utwórz `.agent-os/tasks/F{{ARGS}}-NN.yaml` (NN zgodnie z kolejnością pozycji w roadmapie). Zasady z pliku roli: jedna rola, wąski scope, mierzalne kryteria, migracje osobno i wcześniej.
4. Uruchom `node .agent-os/scripts/gate.mjs`: bramka `contracts` sprawdzi pola, role, zależności i zgodność z roadmapą.
5. W podsumowaniu dla użytkownika pokaż tabelę: ID, rola, zależności, scope.write. To jest **CP-TASK**: człowiek zatwierdza przed startem.
