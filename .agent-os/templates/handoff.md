---
task: {{TASK}}
implementer: {{AGENT}}
status: in_progress   # in_progress | blocked | review | done
branch: {{BRANCH}}
updated: {{DATE}}
---
# Handoff {{TASK}}: {{TITLE}}

Plik przekazania pracy między sesjami i agentami (Claude ↔ Gemini). Aktualizuj go na koniec
każdej sesji (workflow /os-handoff). Następny agent zaczyna od przeczytania tego pliku.

## Stan
<!-- Co działa, co jest zrobione, co jest w połowie. Konkretnie: pliki, funkcje, wyniki bramek. -->

## Następny krok
<!-- Pierwsza rzecz, którą ma zrobić następna sesja. Jedno-trzy zdania. -->

## Kryteria akceptacji
<!-- Przepisz kryteria z kontraktu i odhaczaj: - [x] ... -->

## Decyzje w trakcie
<!-- Drobne decyzje implementacyjne mieszczące się w ADR. Większe: /adr i stop. -->

## Sprawdzone ręcznie
<!-- Urządzenie, platforma, scenariusz, wynik. Jeśli nic: "nie dotyczy" + dlaczego. -->

## Zmienione dokumenty
<!-- docs/02, 03, 04, 05; "brak" jeśli żadnych -->

## Checkpointy
<!-- ID zgłoszone przez gate.mjs (CP-...) i czego potrzebujesz od człowieka. "brak" jeśli żadnych. -->

## Czeka na człowieka
-

## Sesje
- {{DATE}} {{AGENT}}: start
