---
description: "Rozpocznij albo wznów zadanie Vocaly (kontrakt, gałąź, handoff)"
---
<!-- WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie -->
Rozpoczynasz pracę jako **gemini** w Agent OS projektu Vocaly. Argument: `argument podany po /os-start (<ID zadania, np. F1-08> albo puste = następne wolne)`.

1. Jeśli argument jest pusty, uruchom `node .agent-os/scripts/task.mjs next` i zaproponuj użytkownikowi to zadanie. Poczekaj na potwierdzenie.
2. Uruchom `node .agent-os/scripts/task.mjs start <ID> --agent gemini`.
   - Jeśli komenda odmawia (zależności, brudne drzewo), przekaż powód użytkownikowi i zatrzymaj się.
3. Przeczytaj w tej kolejności: `docs/README.md`, dokumenty z `read_first` kontraktu, `docs/05-decyzje.md`, `docs/06-zasady-pracy.md` oraz plik roli `.agent-os/roles/<rola>.md`.
4. Jeśli to wznowienie (handoff już istniał), przeczytaj cały `.agent-os/handoff/<ID>.md`. Szczególnie „Następny krok” i „Czeka na człowieka”. Nie powtarzaj pracy, którą poprzedni agent oznaczył jako zrobioną; zweryfikuj ją jednym uruchomieniem bramek.
5. Przepisz kryteria akceptacji do sekcji „Kryteria akceptacji” w handoff (jeśli jeszcze ich tam nie ma).
6. Przedstaw użytkownikowi krótki plan (3–7 kroków) mieszczący się w `scope.write`. Jeśli zadanie wymaga decyzji, której nie ma w dokumentach, zatrzymaj się i zapytaj (albo /os-adr).
7. Pracuj małymi krokami. Po każdym kroku: `node .agent-os/scripts/gate.mjs`. Commituj często (`feat: …`, po angielsku).
