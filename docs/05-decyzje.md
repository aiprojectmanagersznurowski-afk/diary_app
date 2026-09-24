# Decyzje architektoniczne (ADR)

Każda decyzja ma status: **przyjęta**, **zastąpiona** (ze wskazaniem następczyni) albo **proponowana**. Nowe decyzje dopisuj na końcu z kolejnym numerem. Nie edytuj treści przyjętych decyzji. Jeśli decyzja się zmienia, dodaj nową, która ją zastępuje.

---

### ADR-001: Supabase zamiast Firebase
**Status:** przyjęta, 2026-09-23

Backend przechodzi z Firebase (Auth, Firestore) na Supabase (Postgres + pgvector, Auth, Storage, Edge Functions).

**Dlaczego:**
- relacje między dokumentami i graf to naturalne zastosowanie SQL,
- pgvector trzyma wektory w tej samej bazie co dane,
- wyszukiwanie hybrydowe z filtrami robi się jednym zapytaniem,
- RLS jest łatwiejsze w audycie przy danych wrażliwych,
- zespół zna ten stack.

**Odrzucona alternatywa:** Firestore z wyszukiwaniem wektorowym i Cloud Functions. Wymagałaby mniej przenoszenia, ale gorzej pasuje do grafu i zapytań złożonych.

### ADR-002: Klient Expo zamiast Next.js PWA
**Status:** przyjęta, 2026-09-23

Aplikacja zostaje w Expo. Wersja na komputer to Expo web z tego samego kodu. Pierwotna koncepcja zakładała Next.js PWA, ale natywna aplikacja lepiej obsługuje mikrofon na iOS (PWA na iOS nagrywa tylko na pierwszym planie i ma problemy z formatami audio). Tylko natywna aplikacja pozwala też zbudować aplikację na Apple Watch.

### ADR-003: Wywołania AI wyłącznie po stronie serwera
**Status:** przyjęta, 2026-09-23

Wszystkie wywołania STT, LLM i embeddingów wykonują Edge Functions. Klucze leżą w sekretach Supabase. Dotychczasowy klucz Groq był w pakiecie aplikacji (`EXPO_PUBLIC_GROQ_API_KEY`) i musi zostać unieważniony.

### ADR-004: Dokument jako podstawowa jednostka; baza jest źródłem prawdy
**Status:** przyjęta, 2026-09-23

Notatki i wpisy dnia to wiersze w jednej tabeli `documents` (`kind = 'note' | 'daily'`). Pliki `.md` (nagłówek YAML + odnośniki `[[...]]`, zgodne z Obsidianem) są generowane z danych szablonem, bez LLM, i zapisywane w Storage. Ekrany aplikacji korzystają z danych strukturalnych (`documents.data`).

### ADR-005: Jedno nagranie daje wiele notatek; pomysły dnia to odnośniki
**Status:** przyjęta, 2026-09-23

LLM dzieli nagranie na notatki atomowe z typem `idea`, `task`, `reflection` albo `event`. Wpis dnia powstaje z notatek z danego dnia, a nie z doklejanej i przepisywanej transkrypcji. Sekcja „Pomysły, na które wpadłem” zawiera odnośniki do istniejących notatek typu `idea`, żeby LLM nie wymyślał pomysłów.

### ADR-006: Abstrakcja dostawców AI; Groq domyślnie, Gemini dla embeddingów
**Status:** przyjęta, 2026-09-23

Każde zadanie AI (STT, strukturyzacja, wpis dnia, powiązania, czat, embeddingi) ma osobno konfigurowanego dostawcę i model. Domyślnie działa Groq (dotychczasowe modele). Embeddingi liczy Google Gemini (Groq ich nie oferuje) z wymiarem 1536, bo indeks HNSW w pgvector obsługuje maksymalnie 2000 wymiarów. Klucz Google jest dostępny, więc Gemini jest też alternatywą dla LLM.

### ADR-007: Apple Watch jako natywna aplikacja SwiftUI; transfer przez iPhone'a w MVP
**Status:** przyjęta, 2026-09-23

React Native nie działa na watchOS. Aplikacja zegarka powstaje w SwiftUI jako target dodany przez `@bacons/apple-targets`, co zachowuje generowanie natywnych projektów w Expo. W MVP nagrania trafiają do iPhone'a przez `WCSession.transferFile`, a lokalny moduł Expo przekazuje je do wspólnej kolejki. Dzięki temu zegarek nie potrzebuje własnego logowania. Wysyłanie bezpośrednio z zegarka przychodzi po MVP.

### ADR-008: Brak migracji danych z Firestore
**Status:** przyjęta, 2026-09-23

Aplikacja nie ma użytkowników produkcyjnych. Firebase jest usuwany w całości, bez migracji danych i okresu przejściowego.

### ADR-009: Instrukcje w `src/*/README.md` są nieaktualne
**Status:** przyjęta, 2026-09-23

- `src/infrastructure/README.md` wymaga `groq-sdk` i nagrywania przez `expo-av`. Zastępują to ADR-003 i ADR-006 oraz `expo-audio`.
- `src/presentation/README.md` wymaga animacji przewracania stron w `react-native-reanimated`. Tej funkcji nie ma w zakresie; patrz otwarte kwestie.
- `src/application/README.md` opisuje proces „Nagranie → Transkrypcja → Zapis encji”, który przenosi się na serwer (ADR-003).

Pliki należy zaktualizować albo usunąć w fazie 1.

---

## Otwarte kwestie

| # | Pytanie | Założenie robocze |
|---|---|---|
| Q1 | Czy użytkownik może ręcznie dopisywać treść do wpisu dnia? | Nie. Wpis jest tylko do odczytu. Jeśli tak, dodać sekcję „Moje dopiski”, której przebudowa nie nadpisuje |
| Q2 | Czy pliki `.md` mają się synchronizować z Obsidianem albo Google Drive? | Nie. Na razie tylko eksport `.zip` (faza 7) |
| Q3 | Czy przejść z React Navigation na Expo Router przy wersji web (adresy URL)? | Do decyzji na początku fazy 7 |
| Q4 | Czy „wirtualny pamiętnik” z animacją przewracania stron jest w zakresie? | Poza zakresem do odwołania |
| Q5 | Minimalna wersja watchOS | watchOS 10+ |
| Q6 | Model LLM dla czatu | Wybór po testach jakości po polsku (Groq a Gemini) |
