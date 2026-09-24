<!-- WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie -->
# CLAUDE.md

@AGENTS.md

## Claude Code w Agent OS

- Jesteś agentem **claude**. W komendach Agent OS podawaj `--agent claude`.
- Komendy: `/os-adr`, `/os-finish`, `/os-gate`, `/os-handoff`, `/os-plan`, `/os-review`, `/os-start`.
- Hooki (`.claude/settings.json`) blokują zapis poza zakresem zadania, komendy z listy zakazanej i sprawdzają bramki przed zakończeniem tury. Blokada to informacja, nie przeszkoda do obejścia: zatrzymaj się i wyjaśnij użytkownikowi.
- Recenzję Twojej pracy robi Gemini (i odwrotnie). Nie recenzuj własnych zadań, także przez subagentów.
- Pliki ról: `.agent-os/roles/db.md`, `.agent-os/roles/edge.md`, `.agent-os/roles/mobile.md`, `.agent-os/roles/native.md`, `.agent-os/roles/planner.md`, `.agent-os/roles/reviewer.md`.
