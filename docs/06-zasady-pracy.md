# Zasady pracy

Obowiązują ludzi i agentów AI.

## Zanim zaczniesz

1. Przeczytaj [README.md](README.md) i dokumenty, których dotyczy zadanie.
2. Znajdź zadanie w [04-roadmapa.md](04-roadmapa.md). Jeśli go tam nie ma, najpierw je dopisz.
3. Sprawdź [05-decyzje.md](05-decyzje.md). Nie podważaj przyjętych decyzji w kodzie. Jeśli uważasz, że decyzja jest błędna, zaproponuj nowy ADR.

## Kod

**Warstwy.** Klient trzyma się podziału z [02-architektura.md](02-architektura.md#3-warstwy-w-aplikacji-klienckiej). `presentation` nie importuje `infrastructure`.

**Sekrety:**
- Żadnych kluczy API w kodzie klienta ani w repozytorium.
- Przedrostek `EXPO_PUBLIC_` tylko dla wartości publicznych.
- Pliku `.env` nie commitujemy.

**AI:**
- Wywołania tylko w `supabase/functions/`.
- Prompty jako pliki w `_shared/prompts/`. Zmiana treści promptu wymaga podbicia wersji.
- Każda odpowiedź LLM ma schemat zod w `_shared/schemas/`.

**Baza danych:**
- Zmiany tylko przez migracje w `supabase/migrations/`, nigdy ręcznie w panelu.
- Każda nowa tabela ma włączone RLS i polityki.
- Nowe zapytania korzystające z wektorów idą przez funkcje RPC.

**Natywny kod:**
- `ios/` i `android/` są generowane i ignorowane przez git. Nie edytuj ich ręcznie.
- Zmiany natywne robimy przez `app.json` i wtyczki konfiguracyjne.
- Kod zegarka leży w `targets/watch/`, a moduły natywne w `modules/`.

**Expo:** projekt jest na SDK 54. Korzystaj z dokumentacji tej wersji: https://docs.expo.dev/versions/v54.0.0/

**Język:**
- interfejs, treści generowane przez AI i dokumentacja: po polsku,
- identyfikatory w kodzie: po angielsku,
- komunikaty commitów: po angielsku, w formacie Conventional Commits (`feat:`, `fix:`, `build:`, `chore:`, `docs:`), zgodnie z dotychczasową historią.

**Logi:** nie logujemy treści transkrypcji, notatek ani odpowiedzi LLM.

## Git

- Jedno zadanie to jedna gałąź (`feat/...`, `fix/...`) i jeden pull request. Nie commitujemy bezpośrednio na `main`.
- Małe pull requesty. Zmiana schematu bazy idzie w osobnym PR, przed kodem, który z niego korzysta.
- Hooka pre-commit nie pomijamy (`--no-verify`).

## Definicja ukończenia

Zadanie jest ukończone, gdy:

- [ ] `npx tsc --noEmit` i lint przechodzą bez błędów
- [ ] logika w `domain` i `application` ma testy; Edge Functions mają testy `deno test`
- [ ] migracje stosują się od zera (`supabase db reset`)
- [ ] w zmianach nie ma sekretów ani logowania treści użytkownika
- [ ] zadanie jest odhaczone w [04-roadmapa.md](04-roadmapa.md)
- [ ] dokumentacja jest aktualna: nowa tabela, przepływ albo zmiana stosu trafia do `02` albo `03`, a zmiana decyzji do nowego ADR w `05`
- [ ] opis PR mówi, co zostało sprawdzone ręcznie (urządzenie, platforma)

## Dla agentów AI

- Zaczynaj od `docs/README.md`. Plik `AGENTS.md` w katalogu głównym wskazuje tutaj.
- Jeśli kod jest sprzeczny z dokumentacją, sprawdź w [02-architektura.md](02-architektura.md#10-stan-obecny-a-docelowy), czy chodzi o stan obecny, czy o błąd. Nie „naprawiaj” kodu pod dokumentację poza zakresem swojego zadania.
- Jeśli zadanie wymaga decyzji, której nie ma w dokumentach, zatrzymaj się i zapytaj, zamiast zgadywać. Po decyzji zapisz ją jako ADR.
- Na koniec pracy podaj, które pola w roadmapie odhaczyłeś i które dokumenty zmieniłeś.
