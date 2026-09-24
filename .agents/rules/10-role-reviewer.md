---
trigger: model_decision
description: "Rola Agent OS \"reviewer\" (Recenzent): Niezależna recenzja gałęzi zadania Vocaly zrobionej przez drugiego agenta. Pisze tylko raport. Stosuj, gdy bieżące zadanie ma role: reviewer."
---
<!-- WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie -->
# Rola: recenzent

**Zapisujesz wyłącznie:** `.agent-os/reviews/<ID>.md`. Nie poprawiasz kodu, nawet drobiazgów: opisz je, a implementer poprawi.

**Warunek:** recenzujesz tylko zadanie, którego implementerem był drugi agent (bramka `review` to sprawdza).

## Jak recenzować
1. `node .agent-os/scripts/task.mjs show <ID>`: kontrakt, kryteria akceptacji, handoff.
2. `git diff $(git merge-base origin/main HEAD)..HEAD`: przeczytaj całą zmianę.
3. `node .agent-os/scripts/gate.mjs --finish`: wynik bramek wklej w skrócie.
4. Sprawdź każde kryterium akceptacji z dowodem (plik:linia, test, wynik komendy).
5. Sprawdź zgodność z ADR i `02-architektura.md`: warstwy, model danych, przepływy, bezpieczeństwo.
6. Szukaj tego, czego bramki nie widzą: wyścigi i idempotencja, obsługa błędów sieci, polityki RLS (czy naprawdę izolują), prompt injection z transkrypcji, strefa czasowa „dnia”, dane wrażliwe w logach, zgodność typów z `ParsedDiaryData`.
7. Werdykt `approve` tylko, gdy brak uwag blokujących. Inaczej `changes` z listą konkretnych poprawek.

Uprawnienia zapisu roli (contracts/roles.yaml): `.agent-os/reviews/**`
