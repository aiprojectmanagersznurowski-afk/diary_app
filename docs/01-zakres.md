# Zakres produktu

## Wizja

Vocaly to głosowy pamiętnik i „drugi mózg”. Użytkownik nagrywa myśli na telefonie albo na Apple Watch. System:

- zamienia mowę na tekst,
- dzieli nagranie na pojedyncze notatki,
- klasyfikuje je i łączy z wcześniejszymi myślami,
- codziennie składa z nich wpis pamiętnika.

Notatki i wpisy dnia są dokumentami Markdown w jednej bazie wiedzy. Można je przeglądać jako graf powiązań i zadawać o nie pytania na czacie.

## Użytkownik

- Konto osobiste: każdy użytkownik widzi wyłącznie swoje dane.
- Interfejs i wszystkie treści generowane przez AI są po polsku.
- Brak użytkowników produkcyjnych (stan na 2026-09-23).

## Moduły

### M1. Nagrywanie 📋 (✅ częściowo na telefonie)
- Nagrywanie jednym przyciskiem na iPhonie, Androidzie i Apple Watch.
- **Offline-first:** nagranie jest zapisywane lokalnie i trafia do kolejki, zanim cokolwiek zostanie wysłane. Żadne nagranie nie może zginąć przez brak sieci ani błąd AI.
- Widoczny status każdego nagrania: w kolejce, wysłane, przetwarzane, gotowe, błąd (z możliwością ponowienia).
- ✅ Dziś: nagrywanie na telefonie z wizualizacją poziomu dźwięku i licznikiem. Przetwarzanie odbywa się w aplikacji, bez kolejki.

### M2. Przetwarzanie nagrań 📋
- Transkrypcja mowy na tekst. Surowa transkrypcja jest zawsze przechowywana.
- **Podział nagrania na notatki:** jedno nagranie daje od jednej do kilku notatek, po jednej na myśl.
- Każda notatka dostaje:
  - oczyszczony tekst i tytuł,
  - typ: `idea` (pomysł), `task` (zadanie), `reflection` (refleksja) albo `event` (wydarzenie),
  - kategorię z listy kategorii użytkownika (nową kategorię AI może tylko zaproponować),
  - tagi.
- Automatyczne powiązania z wcześniejszymi dokumentami: podobieństwo semantyczne potwierdzone przez LLM, z uzasadnieniem.

### M3. Pamiętnik dnia 📋 (✅ obecna wersja jako jeden wpis na dzień)
Wpis dnia powstaje z notatek z danego dnia. Zachowuje wszystkie obecne sekcje:
- wiodąca myśl, podsumowanie, najważniejsze cytaty,
- zrobione zadania, ważne wydarzenia (chronologicznie),
- emocje z wyzwalaczami, poziom zmęczenia, stres a spokój,
- wdzięczność, wpływ na cele życiowe, rada w tonie wybranej osobowości AI.

Nowa sekcja **„Pomysły, na które wpadłem”** zawiera listę odnośników do notatek typu `idea` z danego dnia. Nie jest to tekst wygenerowany od nowa.

Wpis dnia jest dokumentem `.md` w bazie wiedzy (M4).

### M4. Baza wiedzy: dokumenty Markdown 📋
- Każda notatka i każdy wpis dnia to osobny dokument `.md` z nagłówkiem YAML i odnośnikami `[[...]]`, w formacie zgodnym z Obsidianem.
- Dokumenty są przeszukiwalne semantycznie i pełnotekstowo, widoczne w grafie i dostępne dla czatu.
- Pliki `.md` są generowane z bazy danych, a nie edytowane ręcznie (szczegóły w [02-architektura.md](02-architektura.md)).

### M5. Graf powiązań 📋
- Interaktywny graf: węzły to dokumenty, krawędzie to powiązania.
- Wpisy dnia są węzłami centralnymi połączonymi z notatkami z tego dnia.
- Filtry: kategoria, typ notatki, zakres dat, minimalna siła powiązania.
- Na komputerze i tablecie pełny graf. Na telefonie sekcja „Powiązane myśli” w szczegółach dokumentu, a pełny graf opcjonalnie.

### M6. Czat z bazą wiedzy (RAG) 📋
- Pytania w języku naturalnym, np. „Jakie miałem wczoraj pomysły na projekt XYZ?”.
- Wyrażenia czasowe („wczoraj”, „w zeszłym tygodniu”) są zamieniane na filtry dat.
- Odpowiedzi zawierają cytaty. Kliknięcie cytatu otwiera dokument źródłowy albo podświetla węzeł w grafie.
- Wątki czatu są zapisywane.

### M7. Analizy i grywalizacja ✅ (do przeniesienia na nowy model danych)
- Wykresy 7 i 30 dni: stres a spokój, energia, zgodność z celami.
- Seria dni z wpisem i odznaki (pierwszy wpis, 3 dni, 7 dni).
- 📋 Zgodność z celami liczona z `goalImpactType` zamiast obecnej heurystyki.
- 📋 Seria liczona po stronie serwera, bo nagrania z zegarka omijają logikę w aplikacji na telefonie.

### M8. Profil i personalizacja ✅
- Głosowy onboarding: 3 pytania, z odpowiedzi AI wyciąga cele życiowe.
- Osobowość AI: Po prostu przyjaciel, Buddha, Józef Piłsudski, Stefan Banach.
- Motywy: Dark, Sepia, Light.
- Udostępnianie wybranych kart wpisu jako obrazka (np. na Instagram).
- 📋 Usuwanie konta i wszystkich danych z poziomu aplikacji (wymóg App Store).

### M9. Aplikacja Apple Watch 📋
**MVP:**
- Natywna aplikacja watchOS z jednym dużym przyciskiem nagrywania i licznikiem czasu.
- Nagrania czekają w kolejce na zegarku, jeśli iPhone jest poza zasięgiem, i są przesyłane automatycznie, gdy wróci.
- Lista ostatnich nagrań ze statusem: na zegarku, przesłane do iPhone'a, przetworzone.
- Logowanie tylko przez iPhone'a, bez osobnego logowania na zegarku.

**Po MVP:**
- Komplikacja na tarczy zegarka uruchamiająca nagrywanie.
- Obsługa przycisku Action Button (Apple Watch Ultra).
- Wysyłanie nagrań bezpośrednio z zegarka (LTE/Wi-Fi), bez pośrednictwa iPhone'a.

**Poza zakresem na zegarku:** przeglądanie notatek, czat, graf.

### M10. Wersja na komputer 📋
- Wersja przeglądarkowa (Expo web) z układem: graf i czat obok siebie, lista dokumentów, podgląd `.md`.
- Eksport całej bazy jako archiwum `.zip` z plikami `.md` (sejf Obsidiana).

## Poza zakresem (na teraz)

- Współdzielenie notatek między użytkownikami.
- Aplikacja na Wear OS.
- Dwustronna synchronizacja z Obsidianem ani ręczna edycja plików `.md` poza aplikacją.
- Transkrypcja na urządzeniu i własny hosting modeli.
- Wirtualny pamiętnik z animacją przewracania stron (z `src/presentation/README.md`): otwarta kwestia, patrz [05-decyzje.md](05-decyzje.md).
