# Dokumentacja projektu Vocaly

Punkt wejścia dla ludzi i agentów AI pracujących nad projektem. Przeczytaj ten plik przed rozpoczęciem jakiejkolwiek pracy.

## Kolejność czytania

| Plik | Po co |
|---|---|
| [01-zakres.md](01-zakres.md) | Co budujemy, dla kogo, co jest poza zakresem |
| [02-architektura.md](02-architektura.md) | Jak działa system: komponenty, model danych, przepływy, bezpieczeństwo |
| [03-stos-technologiczny.md](03-stos-technologiczny.md) | Technologie i wersje, modele AI, sekrety, co usuwamy |
| [04-roadmapa.md](04-roadmapa.md) | Fazy, zadania, kryteria ukończenia, znane błędy |
| [05-decyzje.md](05-decyzje.md) | Podjęte decyzje architektoniczne (ADR) i otwarte kwestie |
| [06-zasady-pracy.md](06-zasady-pracy.md) | Jak pracujemy: kod, dokumentacja, definicja ukończenia |

## Stan projektu (2026-09-23)

Projekt jest w trakcie przebudowy z „głosowego pamiętnika” w „głosowy pamiętnik + Second Brain”.

- **Kod w `src/` odpowiada stanowi obecnemu:** Expo + Firebase (Auth, Firestore), a Groq jest wywoływany bezpośrednio z aplikacji.
- **Dokumentacja opisuje stan docelowy:** Supabase, przetwarzanie AI po stronie serwera, notatki i wpisy dnia jako dokumenty `.md`, graf, czat, Apple Watch.
- Aplikacja nie ma użytkowników produkcyjnych, więc nie migrujemy danych.

Oznaczenia używane w dokumentach:

| Znak | Znaczenie |
|---|---|
| ✅ | istnieje w kodzie |
| 🚧 | w trakcie |
| 📋 | zaplanowane |
| ❌ | do usunięcia |

## Nadrzędność

Jeśli `docs/` jest sprzeczne z innymi instrukcjami, obowiązuje `docs/`. Dotyczy to w szczególności plików `src/*/README.md`, które są nieaktualne (patrz [05-decyzje.md](05-decyzje.md)).

Zmiana decyzji z [05-decyzje.md](05-decyzje.md) wymaga nowego wpisu ADR. Nie zmieniaj jej po cichu w kodzie.
