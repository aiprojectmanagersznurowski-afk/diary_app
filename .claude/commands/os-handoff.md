---
description: "Zakończ sesję i przekaż pracę drugiemu agentowi (Claude ↔ Gemini) albo sobie na później"
argument-hint: "[krótka notatka]"
---
<!-- WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie -->
Kończysz sesję jako **claude**. Następna sesja może być prowadzona przez innego agenta, który nie zna tej rozmowy: wszystko, co ważne, musi być w repozytorium.

1. `node .agent-os/scripts/gate.mjs`: zanotuj wynik.
2. Zacommituj ukończone kawałki pracy (Conventional Commits po angielsku). Kod w połowie: commit `wip:` jest niedozwolony; użyj `chore: wip <co>` albo zostaw niezacommitowane i opisz dokładnie w „Stan”.
3. Zaktualizuj `.agent-os/handoff/<ID>.md`:
   - **Stan:** co zrobione (pliki, funkcje), co w połowie, wynik bramek.
   - **Następny krok:** pierwsza konkretna czynność dla następnej sesji.
   - **Kryteria akceptacji:** odhacz spełnione.
   - **Decyzje w trakcie:** drobne decyzje i ich uzasadnienie.
   - **Checkpointy / Czeka na człowieka:** czego brakuje od człowieka (klucz, decyzja, test na urządzeniu).
   - **status:** `in_progress`, `blocked` (czeka na człowieka) albo `review` (gotowe do recenzji).
4. `node .agent-os/scripts/task.mjs handoff --agent claude $ARGUMENTS` (dopisuje wpis w „Sesje”).
5. Zacommituj handoff: `docs: update handoff for <ID>`.
6. Podsumuj użytkownikowi w 3–5 zdaniach: stan, następny krok, czego potrzebujesz od niego.
