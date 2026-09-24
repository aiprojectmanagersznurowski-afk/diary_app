---
name: finish
description: Sprawdź definicję ukończenia zadania i przygotuj je do recenzji drugiego agenta
---
Kończysz zadanie jako **{{AGENT}}**.

1. Upewnij się, że każde kryterium akceptacji z kontraktu jest spełnione (dowód: test, komenda, plik:linia).
2. Odhacz pozycję zadania w `docs/04-roadmapa.md` (`- [x]`). Tylko tę jedną.
3. Zaktualizuj dokumentację, jeśli dotyczy: nowa tabela, przepływ albo zmiana stosu → `docs/02` / `docs/03`; zmiana decyzji → nowy ADR (/os-adr).
4. Uzupełnij handoff: „Sprawdzone ręcznie” (urządzenie, platforma albo „nie dotyczy” + dlaczego), „Zmienione dokumenty”, „Checkpointy”; ustaw `status: review`.
5. Uruchom `node .agent-os/scripts/gate.mjs --finish` (bramki + tsc, lint, testy, `supabase db reset`). Napraw wszystko, co czerwone.
6. Zacommituj i wypchnij gałąź: `git push -u origin <gałąź>` (nigdy na main).
7. Napisz użytkownikowi: które pola w roadmapie odhaczyłeś, które dokumenty zmieniłeś, co sprawdziłeś ręcznie, jakie checkpointy czekają. Poproś, żeby recenzję zrobił **drugi agent** (/os-review <ID>) i żeby PR otworzył człowiek.
