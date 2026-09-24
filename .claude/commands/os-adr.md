---
description: "Zaproponuj decyzję architektoniczną (ADR) zamiast zgadywać albo zmieniać decyzję w kodzie"
argument-hint: "<czego dotyczy decyzja>"
---
<!-- WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie -->
Temat decyzji: `$ARGUMENTS`.

1. Przeczytaj `docs/05-decyzje.md` w całości. Sprawdź, czy decyzja już istnieje albo czy to otwarta kwestia (Q1–Q6).
2. Dopisz na końcu sekcji ADR (przed „## Otwarte kwestie”) nowy wpis z kolejnym numerem:

   ```
   ### ADR-0NN: <tytuł>
   **Status:** proponowana, <RRRR-MM-DD>

   <decyzja w 2–4 zdaniach>

   **Dlaczego:**
   - …

   **Odrzucona alternatywa:** …
   ```
   Jeśli zastępuje wcześniejszą decyzję, napisz „Zastępuje ADR-0XX”. Starej decyzji nie edytujesz.
3. Status zawsze `proponowana`. Przyjmuje ją człowiek (bramka `adr`, CP-ADR).
4. Wpisz CP-ADR w handoff („Czeka na człowieka”) i **zatrzymaj pracę zależną od tej decyzji**. Zapytaj użytkownika.
