---
description: "Niezależna recenzja zadania zrobionego przez drugiego agenta"
argument-hint: "<ID zadania>"
---
<!-- WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie -->
Recenzujesz zadanie `$ARGUMENTS` jako **claude** w roli recenzenta. Przeczytaj `.agent-os/roles/reviewer.md`.

1. Przełącz się na gałąź zadania (`git switch <gałąź z kontraktu>`, `git pull`).
2. Sprawdź w `.agent-os/handoff/$ARGUMENTS.md`, że `implementer` to nie Ty (claude). Jeśli to Ty: odmów i poproś o recenzję drugiego agenta.
3. Przeprowadź recenzję wg `.agent-os/roles/reviewer.md`. Nie zmieniaj kodu.
4. Utwórz `.agent-os/reviews/$ARGUMENTS.md` z szablonu `.agent-os/templates/review.md` (reviewer: claude); werdykt `approve` albo `changes`.
5. Zacommituj: `docs: add review for $ARGUMENTS` i wypchnij.
6. Jeśli `changes`: implementer (drugi agent) poprawia, a Ty recenzujesz ponownie, aktualizując ten sam plik.
7. Podsumuj użytkownikowi werdykt i uwagi blokujące.
