---
description: "Niezależna recenzja zadania zrobionego przez drugiego agenta"
---
<!-- WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie -->
Recenzujesz zadanie `argument podany po /os-review (<ID zadania>)` jako **gemini** w roli recenzenta. Przeczytaj `.agent-os/roles/reviewer.md`.

1. Przełącz się na gałąź zadania (`git switch <gałąź z kontraktu>`, `git pull`).
2. Sprawdź w `.agent-os/handoff/argument podany po /os-review (<ID zadania>).md`, że `implementer` to nie Ty (gemini). Jeśli to Ty: odmów i poproś o recenzję drugiego agenta.
3. Przeprowadź recenzję wg `.agent-os/roles/reviewer.md`. Nie zmieniaj kodu.
4. Utwórz `.agent-os/reviews/argument podany po /os-review (<ID zadania>).md` z szablonu `.agent-os/templates/review.md` (reviewer: gemini); werdykt `approve` albo `changes`.
5. Zacommituj: `docs: add review for argument podany po /os-review (<ID zadania>)` i wypchnij.
6. Jeśli `changes`: implementer (drugi agent) poprawia, a Ty recenzujesz ponownie, aktualizując ten sam plik.
7. Podsumuj użytkownikowi werdykt i uwagi blokujące.
