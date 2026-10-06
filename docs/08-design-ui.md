# Design UI: brief wdrożeniowy (Faza 8)

Źródło: brief z narzędzia projektowego (Figma Make) przeniesiony do repozytorium 2026-10-06. Referencja wizualna i behawioralna: [design/Main.dc.html](design/Main.dc.html) (klikalny prototyp HTML w ramce iPhone 15 Pro; otwórz w przeglądarce, wymaga pliku `support.js` z oryginalnego eksportu, którego nie ma w repozytorium — sam układ i style są czytelne w źródle). Prototyp jest **specyfikacją, nie kodem do skopiowania**.

Ten dokument obowiązuje od Fazy 8 ([04-roadmapa.md](04-roadmapa.md)). Poniższa sekcja „Decyzje wdrożeniowe” ma pierwszeństwo przed sugestiami bibliotek i „produktem” z briefu poniżej.

## Decyzje wdrożeniowe (stan repozytorium vs brief)

1. **Bez nowych zależności natywnych.** Animacje robimy przez `Animated` z React Native, szuflady i modale przez `Modal`, wykresy przez `react-native-svg`, gradient przez `expo-linear-gradient` i `@react-native-masked-view/masked-view`, rozmycie przez `expo-blur`. Nie dodajemy `react-native-reanimated`, `react-native-gesture-handler`, `@gorhom/bottom-sheet`, `@shopify/react-native-skia`, `d3-force` ani `expo-router`. Brief je sugeruje (sekcja 5), ale wymagają one zgody człowieka (CP-DEP) i przebudowy natywnej. Jeśli któryś okaże się konieczny, zadanie zatrzymuje się i prosi o decyzję.
2. **Nawigacja zostaje na `@react-navigation/native-stack`** (stan obecny: jeden stos bez tab bara, bramka w `App.tsx`). Przejście ekranów: fade + translateY ~46 px, 400 ms.
3. **Graf zostaje na `react-force-graph-2d` w Expo DOM Component** (`components/graph/`). Zmieniamy wygląd, filtry i szufladę zgodnie z briefem; nie przepisujemy renderera na Skia.
4. **Dane są prawdziwe, nie przykładowe.** Wszystko, co prototyp liczy lokalnie (statusy nagrań, notatki, wpis dnia, seria, wykresy, graf, czat), w aplikacji pochodzi z Supabase (tabele `recordings`, `documents`, `profiles`, RPC, Edge Function `chat`). Elementy „Tylko prototyp” z briefu (przełącznik „Demo: powracający użytkownik”, stałe opóźnienia etapów, losowa pula notatek, „błąd” przy 4. nagraniu, +1 do serii przy każdym nagraniu, szablonowe odpowiedzi czatu, stałe chipy celów w onboardingu) **nie trafiają do aplikacji**.
5. **Teksty UI** wyciągamy do jednego pliku stałych (`src/presentation/i18n/pl.ts`), dokładnie jak w prototypie.
6. **Motyw.** Obecne nazwy motywów (`AppleDark`, `AppleLight`, `Sepia`) i pole w profilu zostają; brief nazywa je Dark / Light / Sepia (etykiety w UI). Wszystkie kolory komponentów czytamy z jednego obiektu motywu (`THEMES` w `useSettingsStore.ts` rozszerzony o tokeny z briefu).
7. **Zegarek.** Wygląd aplikacji watchOS (SwiftUI w `targets/watch/`) to osobne zadanie roli `native` na końcu fazy; panel zegarka z prototypu nie jest ekranem aplikacji mobilnej.

### Otwarte pytania do właściciela produktu (brief, sekcja 7)

Do czasu odpowiedzi zadania używają bezpiecznych domyślnych wartości i nie dopisują nowej logiki serwerowej:

| Temat | Domyślne zachowanie w Fazie 8 |
|---|---|
| Progi odznak | zostają obecne (`Pierwszy Krok`, seria 3, seria 7); brief sugeruje próg 4 dla „Trzy Dni Refleksji” tylko jako wynik demo |
| Zasady serii | bez zmian: seria z `profiles.current_streak` liczona na serwerze (`build-daily`) |
| „Zgodność z celami” | z `goalImpactType` wpisów dnia (jak dziś); **paski postępu per cel nie są wdrażane** (serwer nie liczy zgodności per cel) |
| Stres / spokój / energia | z pól wpisu dnia (`stressVsCalm`, `fatigueLevel`), jak dziś |
| Zakres wersji 1 | zegarek, eksport `.md` i udostępnianie story są w zakresie (są w roadmapie) |
| Polityka audio, limity nagrania | poza zakresem Fazy 8 |

---

# Vocaly – brief wdrożeniowy UI (dla agenta: Expo SDK 54 / React Native)

Referencja wizualna i behawioralna: `Main.dc.html` (klikalny prototyp w ramce iPhone 15 Pro + panel Apple Watch).
**Prototyp to HTML – nie kopiuj go 1:1.** Traktuj go jako specyfikację: wygląd, treści, stany, przepływy. Cały tekst UI jest po polsku i ma zostać dokładnie taki, jak w prototypie (wyciągnij go do pliku i18n/stałych).

## 0. Zasady nadrzędne

1. Jeden stos nawigacji, **bez tab bara**. Ekrany „wjeżdżają” od dołu (fade + translateY ~46 px, 400 ms), przycisk wstecz (chevron w szklanym kółku 40 px, lewy górny róg) faktycznie cofa.
2. Bramka startowa: niezalogowany → Logowanie; zalogowany bez celów → Onboarding; reszta → Ekran główny.
3. Motyw zmienia się natychmiast w całej aplikacji (Dark / Light / Sepia) – wszystko ma czytać kolory z jednego obiektu `theme`, żadnych zahardkodowanych hexów w komponentach (wyjątek: kolory semantyczne z sekcji 2.3).
4. Font: systemowy (SF Pro na iOS). Tytuły waga 800, letter-spacing -0.5, jako tekst z gradientem. Etykiety sekcji: UPPERCASE 12 px, waga 700, letter-spacing 1.5, kolor secondary. Body 14–16 px.
5. Ton: spokojny, ciepły, „Apple-like”. Szklane karty (blur + obramowanie 1 px + promień 20–24).

## 1. Tokeny – motywy

| token | Dark (domyślny) | Light | Sepia |
|---|---|---|---|
| background | `#000000` | `#FFFFFF` | `#F4ECD8` |
| text | `#E2E8F0` | `#1C1C1E` | `#4A3B32` |
| secondary | `#94A3B8` | `#8E8E93` | `#7A6B62` |
| primary | `#A78BFA` | `#007AFF` | `#D97757` |
| border | `rgba(255,255,255,0.10)` | `rgba(0,0,0,0.05)` | `rgba(0,0,0,0.10)` |
| card | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.82)` | `rgba(255,255,255,0.42)` |
| card2 (wgłębienia, chipy) | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.04)` | `rgba(74,59,50,0.06)` |
| track (tła pasków/pierścieni) | `rgba(255,255,255,0.10)` | `rgba(0,0,0,0.07)` | `rgba(74,59,50,0.09)` |
| sheet (szuflady, modale) | `rgba(24,24,28,0.94)` | `rgba(255,255,255,0.97)` | `rgba(250,244,230,0.97)` |
| onPrimary (tekst na primary) | `#0B0B12` | `#FFFFFF` | `#FFFFFF` |
| gradient (3 stopy) | `#A78BFA → #F472B6 → #38BDF8` | `#007AFF → #5856D6 → #FF2D55` | `#D97757 → #C48A71 → #8C5A46` |
| aurora (3 plamy, mocno rozmyte) | fiolet / róż / błękit, alfa ~0.4–0.5 | te same barwy, alfa ~0.11–0.16 | ciepłe, alfa ~0.13–0.20 |

Aurora: trzy rozmyte koła (blur ~70) za treścią, wolno dryfują (16–22 s, alternate). W RN: `expo-blur` + animowane widoki z `Reanimated`, albo gotowy gradient radialny z `react-native-svg`.

### 1.1 Kolory akcentów (stałe we wszystkich motywach)
pink `#F472B6`, blue `#60A5FA`, sky `#38BDF8`, indigo `#818CF8`, purple `#A855F7`, amber `#FBBF24`, lilac `#F0ABFC`, error `#F87171`/`#EF4444`, success `#34D399`, neutral `#9CA3AF`.

### 1.2 Kolory semantyczne
- **Emocje (pigułki, tekst `#1A1625`):** Radość `#FDBA74`, Spokój `#7DD3FC`, Stres `#FCA5A5`, Wdzięczność `#C4B5FD`, Skupienie `#93C5FD`, Zmęczenie `#A5B4FC`, Nadzieja `#F0ABFC`.
- **Typy notatek:** Pomysł `#FBBF24` (ikona zap), Zadanie `#60A5FA` (check-square), Refleksja `#F0ABFC` (feather), Wydarzenie `#38BDF8` (calendar). Chip typu = kolor typu z alfa ~18% w tle.
- **Statusy nagrań (chip, tekst `#0B0B12`):** W kolejce `#9CA3AF`, Wysłane `#60A5FA`, Transkrypcja... `#A78BFA`, Podział na notatki... `#A78BFA`, Gotowe `#34D399`, Błąd `#F87171`. Chipy w toku pulsują (opacity 1 ↔ .45, 1.2 s).
- **Wpływ na cele:** pozytywny `#34D399`, neutralny `#D1D5DB`, negatywny `#F87171`.

### 1.3 Kształty i cienie
Karta: promień 22, padding 16, cień `0 8px 20px rgba(0,0,0,0.1)`. Chip: promień 12. Okrągłe przyciski nagłówka: 40 px. Przycisk nagrywania: 76 px (FAB), 96 px (onboarding/overlay), gradient `#A78BFA → #F472B6 → #60A5FA`; w trakcie nagrywania czerwony gradient `#EF4444 → #B91C1C` z trzema pulsującymi pierścieniami (scale 1 → 2.3, opacity .9 → 0, przesunięte o 0.6 s). Ikony: styl Feather (outline, stroke 2) – `lucide-react-native` lub `@expo/vector-icons` Feather.

## 2. Ekrany i zachowanie

### 2.1 Logowanie
Ikona aplikacji (serce + fala dźwiękowa, neonowy fiolet/róż), „Vocaly”, „Twój pamiętnik głosowy”. Białe przyciski „Sign in with Apple” i „Zaloguj z Google”. Dotknięcie → spinner 1 s → Onboarding (pierwsze uruchomienie). **Tylko prototyp:** ukryty przełącznik „Demo: powracający użytkownik” omija onboarding – w produkcie usuń.

### 2.2 Onboarding
„Witaj w” + gradientowe „Twoim Pamiętniku”, „Zdefiniuj swoje 2 główne cele.” Karta „KROK 1 Z 2”, pytanie „Jaki jest Twój najważniejszy cel osobisty lub zdrowotny?”, przycisk nagrywania. Dotknięcie → nagrywanie z timerem → dotknięcie → „Przetwarzam...” (1,5 s) → „KROK 2 Z 2” „Jaki jest Twój główny cel zawodowy?” → nagrywanie → „Analizuję Twoje cele...” (2 s) → „Twoje cele ustawione!” z chipami celów i przyciskiem „Zaczynamy”. Link „Pomiń” → home z celem „Chcę prowadzić pamiętnik i dbać o swój nastrój”.
**Produkt:** zamiast stałych 3 chipów, cele mają pochodzić z transkrypcji + ekstrakcji (LLM). W prototypie to zawsze: „Biegać 3 razy w tygodniu”, „Lepiej się wysypiać”, „Awansować na seniora”.

### 2.3 Ekran główny „Mój Pamiętnik”
- Nagłówek: licznik serii (płomień + liczba, otwiera Osiągnięcia) oraz przyciski w kółkach: Graf wiedzy (share-2, `#38BDF8`), Czat (message-circle, `#A855F7`), **Nagrania (activity, `#F472B6`, z licznikiem w toku; czerwony przy błędzie)**, Osiągnięcia (award, `#FBBF24`), Ustawienia (settings).
- Data („Wtorek, 6 października”) i tytuł „Mój Pamiętnik”.
- **Pasek statusu przetwarzania** – widoczny tylko gdy coś jest w toku lub w błędzie („N nagrań w przetwarzaniu” / „Błąd przetwarzania nagrania”), dotknięcie otwiera ekran Nagrania.
- Karta **„Podsumowanie tygodnia”**: pierścień zgodności z celami życiowymi (np. 72%), tytuł „Zgodność z celami życiowymi”, krótki komunikat, paski postępu dla każdego aktualnego celu, link „Zobacz Weekly Insights →” (cała karta otwiera Analizy).
- Przełącznik segmentowy „Wpisy dnia” | „Notatki (N)”.
  - **Wpisy dnia:** karty z datą długą, myślą dnia, 3-liniowym streszczeniem, pigułkami emocji; dzisiejszy ma plakietkę „Dziś”; tap → Szczegóły wpisu.
  - **Notatki:** filtry Wszystkie / Pomysły / Zadania / Refleksje / Wydarzenia (faktycznie filtrują), karty (chip typu z ikoną, czas, tytuł, 2 linie tekstu) → Szczegóły notatki. Pusty stan: „Brak notatek tego typu. Nagraj coś nowego!”.
- Pływający przycisk nagrywania (dół, wyśrodkowany).

### 2.4 Nagrywanie (rdzeń produktu)
1. Tap FAB → pełnoekranowy overlay z rozmyciem, pulsujące gradientowe fale, timer `mm:ss`, equalizer, przycisk stop. Dynamic Island rozszerza się i pokazuje czerwoną kropkę + timer.
2. Stop → overlay znika, pigułka „Przetwarzam nagranie...” (1 s), potem na liście pojawia się „Nagranie z HH:MM”.
3. Pipeline (w prototypie co ~1,5 s): **W kolejce → Wysłane → Transkrypcja... → Podział na notatki... → Gotowe**. Pasek postępu pod wierszem (20/40/60/80/100%).
4. „Gotowe”: dopisz 2–3 nowe notatki, zaktualizuj dzisiejszy wpis dnia (subtelne podświetlenie ok. 2,6 s), licznik „Notatki (N)” rośnie, seria rośnie.
5. Błąd: chip „Błąd” (`#F87171`) + przycisk „Ponów przetwarzanie” → restart pipeline’u.
6. Pierwsze udane nagranie: modal „Nowe Osiągnięcie!” z odznaką „Pierwszy Krok” i przyciskiem „Świetnie!”. Kolejne odznaki kolejkują się w modalach.

**Tylko prototyp (zastąp prawdziwym):** stałe opóźnienia etapów, losowa pula 4 zestawów przykładowych notatek, „błąd” zawsze przy 4. nagraniu (na etapie „Wysłane”), dodawanie +1 do serii przy każdym nagraniu. W produkcie: statusy z Supabase Realtime (`recordings.status`), notatki z odpowiedzi przetwarzania, seria liczona po dniach kalendarzowych.

### 2.5 Ekran „Twoje nagrania” (nowy – przeniesiony z głównego)
Dostępny z przycisku w nagłówku. Zawiera: trzy kafelki (Wszystkie / W toku / Błędy), sekcję **„Status nagrań na żywo”** (tylko nagrania w toku lub w błędzie, wiersz: ikona źródła iPhone/zegarek, etykieta „Nagranie z HH:MM”, podpis „Dziś · iPhone/Apple Watch”, pasek postępu, chip statusu, ew. przycisk ponowienia) oraz **„Lista nagrań”** (gotowe, z liczbą notatek, tap → wpis dnia). Pusty stan żywej listy: „Nic się teraz nie przetwarza. Dotknij mikrofonu, aby nagrać nowy wpis.” Na tym ekranie jest też FAB nagrywania.

### 2.6 Szczegóły wpisu dnia
Sekcje (karty), w tej kolejności: Myśl dnia (hero z gradientowym tekstem, streszczenie, cytat) · **Emocje** (pigułka + trigger) · **Zrobione** (checklista) · **Ważne wydarzenia** · **Wpływ na cele** (plakietka pozytywny/neutralny/negatywny + tekst + chipy aktualnych celów) · **Rada oparta na twoich celach** (z podpisem „Głos: {osobowość}”) · **Za to jestem wdzięczny** · **💡 Pomysły, na które wpadłem** (karty → notatka) · **Najważniejsze słowa** (chipy) · „Notatki z tego dnia (N)” · **POWIĄZANE MYŚLI** (karty z tagiem relacji: „podobny temat”, „ten sam dzień”, „dzień wcześniej”, „dzień później”, „podobny nastrój” → wpis/notatka).
Prawy górny róg: share i dokument.
- **Tryb udostępniania:** karty sekcji stają się zaznaczalne (znacznik z checkiem, obramowanie primary; Myśl dnia domyślnie zaznaczona), górny pasek „Anuluj” / „Wybrane sekcje: N” / „Gotowe”. „Gotowe” otwiera podgląd story 9:16 (gradient motywu, data, wybrane sekcje, stopka „Wygenerowano w Mój Pamiętnik AI”) i arkusz udostępniania w stylu iOS (Wiadomości, Instagram, Zapisz obraz) – w produkcie: renderuj widok do obrazu (`react-native-view-shot`) i użyj `expo-sharing` / `expo-media-library`.
- **Dokument:** szuflada „Podgląd pliku .md” – wpis jako Markdown w monospace (frontmatter: data, typ, tagi, emocje, wpływ na cele, osobowość; nagłówki; `[[wikilinki]]` do notatek), przycisk „Gotowe”. W produkcie to ma być prawdziwy eksport (np. do Obsidian).

### 2.7 Szczegóły notatki
Chip typu, tytuł (gradient), pełny tekst, data i czas, źródło („Nagrane na iPhonie” / „Nagrane na Apple Watch”), link do wpisu dnia, POWIĄZANE MYŚLI (powiązania z grafu i z tego samego dnia).

### 2.8 Twoje Analizy
Przełącznik 7 dni / 30 dni zmienia dane. Wykres liniowy „Stres vs. Spokój” (Stres `#F87171`, Spokój `#38BDF8`, wygładzone krzywe, wypełnienie pod Spokojem, kropki na ostatnim punkcie), kafelki średnich (stres, spokój, energia), wykres słupkowy energii, pierścień „Zgodność z celami życiowymi” (72% dla 7 dni, 64% dla 30) z komunikatem „Ostatnie dni świetnie przybliżyły Cię do celów” i paskami per cel. Wykresy: `react-native-svg` (lub `victory-native`).
**Produkt:** wartości stresu/spokoju/energii i zgodności z celami mają pochodzić z analizy emocji wpisów dnia; w prototypie to dane przykładowe.

### 2.9 Osiągnięcia
„Twoja obecna seria” – duża liczba z płomieniem, 7 kropek tygodnia, tekst „Do odznaki … brakuje N dni serii.” „Gablota Odznak”: **Pierwszy Krok** (pierwsze nagranie), **Trzy Dni Refleksji** (w prototypie próg: seria 4 dni), **Tydzień Świadomości** (seria 7 dni). Zablokowane: wyszarzone (opacity ~.45, grayscale) z ikoną kłódki i wymaganiem. **Ustal docelowe progi z właścicielem produktu** – nazwa „Trzy Dni” a próg 4 to wynik demo (seria startowa 3).

### 2.10 Ustawienia
„Twoje Aktualne Cele Życiowe” (chipy) · „Osobowość AI” (radio: Po prostu przyjaciel, Buddha, Józef Piłsudski, Stefan Banach; zmiana przepisuje radę we wpisach, jest podgląd) · „Wybór Motywu Akcentów” (Dark / Light / Sepia, natychmiast) · „Zarządzanie”: „Zresetuj Cele Życiowe” (alert potwierdzenia → Onboarding), „Wyloguj się” (czerwony, alert → Logowanie). Alerty w stylu iOS (Anuluj + czerwona akcja).
**Produkt:** rady generuje LLM z promptem zależnym od osobowości (Groq/Gemini po stronie serwera); w prototypie to szablony tekstowe.

### 2.11 Graf wiedzy
Interaktywny graf siłowy: duże węzły = wpisy dnia (gradient, obwódka), małe = notatki w kolorze typu, krawędzie = powiązania (grubość/krycie ~ siła). Przeciąganie węzłów, przeciąganie tła (pan), zoom (przyciski ±, reset, pinch w produkcie), tap w węzeł → dymek z rodzajem, tytułem i przyciskami „Otwórz” / „Zamknij”. Filtr (lejek) → szuflada **„Filtry grafu”**: „ZAKRES DAT” (7 / 30 / 90 dni / Wszystkie), „TYPY NOTATEK” (4 przełączniki), „POWIĄZANIA SEMANTYCZNE” (Wszystkie / Średnie (≥ 0.5) / Mocne (≥ 0.7)), „Wyczyść”; filtr naprawdę ukrywa węzły i krawędzie. Licznik „N węzłów · M powiązań · zoom”.
W RN: `@shopify/react-native-skia` + `d3-force` (symulacja) + `react-native-gesture-handler`. Waga krawędzi = podobieństwo embeddingów (cosine) z Supabase pgvector.

### 2.12 Czat z pamiętnikiem
Stan pusty: „Szybkie pytania do pamiętnika” z czterema chipami: „Jakie miałem wczoraj pomysły?”, „Co zapisałem w tym tygodniu?”, „Podsumuj moje ostatnie refleksje”, „Jakie mam cele i postępy?”. Pole „Zadaj pytanie swojemu pamiętnikowi...” + wyślij. Po wysłaniu: bąbel użytkownika → „Odpowiadam...” (1 s) → odpowiedź **streamowana słowo po słowie** + chipy „Źródła:” (np. „Pomysł · 4 paź”), które otwierają cytowaną notatkę/wpis. **Produkt:** RAG po notatkach (pgvector) + streaming z modelu; odpowiedzi w prototypie są szablonami zbudowanymi z danych przykładowych.

### 2.13 Apple Watch
Ekran „Vocaly”: duży mikrofon (po dotknięciu czerwony stop z timerem), sekcje „Transfer” (godzina + „oczekuje” → „wysłano”) i „Status” (zegar szary → zielony checkmark po „Gotowe”). Nagranie z zegarka przechodzi ten sam pipeline na iPhonie i jest oznaczone ikoną zegarka. W produkcie: osobna aplikacja watchOS + `WatchConnectivity` (transferFile); prototyp pokazuje tylko zachowanie. Jeśli zegarek wypada z zakresu pierwszej wersji, pomiń ten panel.

## 3. Model stanu (do przeniesienia 1:1)

```ts
type NoteType = 'pomysl' | 'zadanie' | 'refleksja' | 'wydarzenie';
type Personality = 'friend' | 'buddha' | 'pilsudski' | 'banach';
type ThemeName = 'dark' | 'light' | 'sepia';

interface Recording { id; time: 'HH:MM'; day: 'Dziś'|'Wczoraj'; source: 'telefon'|'zegarek';
  stage: 0|1|2|3|4; error: boolean; noteCount?: number; entryId?: string }
// stage → etykieta: 0 W kolejce, 1 Wysłane, 2 Transkrypcja..., 3 Podział na notatki..., 4 Gotowe
interface Note { id; day: EntryId; time; source; type: NoteType; title; text; rel: [id, weight][] }
interface DailyEntry { id; iso; long; short; dominant; summary; quotes[]; emotions: {name, trigger}[];
  done[]; events[]; goal: {level: 'pozytywny'|'neutralny'|'negatywny', text}; core(advice seed);
  grateful[]; keywords[]; related: [kind, id, relation][]; stress; calm; energy }
interface AppState { authed; hasGoals; goals: string[]; streak; unlockedBadges; personality; theme;
  homeTab: 'entries'|'notes'; noteFilter; recordings[]; notes[]; entries[]; modalQueue[] }
```

## 4. Dane przykładowe (zachowaj do testów/Storybooka)
Cele: „Biegać 3 razy w tygodniu”, „Lepiej się wysypiać”, „Awansować na seniora”. 7 wpisów dnia (od 29 września do 6 października, z przerwą 3 października, żeby seria startowa wynosiła 3) i 23 notatki powiązane z dniem; seria startowa 3; odznaka „Pierwszy Krok” odblokowana; 3 gotowe nagrania. Pełny zestaw jest w `Main.dc.html` (`seedEntries()`, `seedNotes()`, `pairs()`).

## 5. Sugerowane biblioteki (Expo SDK 54)
`expo-router` (stack, `presentation: 'modal'` dla szuflad) · `react-native-reanimated` + `react-native-gesture-handler` · `expo-blur` · `expo-linear-gradient` + `@react-native-masked-view/masked-view` (gradientowy tekst) · `react-native-svg` · `@shopify/react-native-skia` + `d3-force` (graf) · `expo-audio` (nagrywanie; `expo-av` jest wycofywane w SDK 54 – sprawdź aktualny stan) · `expo-haptics` · `react-native-view-shot` + `expo-sharing` · `expo-media-library` · `@gorhom/bottom-sheet` (szuflady) · Zustand (stan) · `@supabase/supabase-js` (+ Realtime).

## 6. Kryteria akceptacji (skrót)
- Każdy przycisk z prototypu coś robi; brak ślepych zaułków i angielskiego tekstu UI (wyjątek: „Sign in with Apple”, „Demo”, „Weekly Insights”, „Dark/Light/Sepia”, „Graf wiedzy”).
- Przełączenie motywu w Ustawieniach przemalowuje wszystkie ekrany bez przeładowania.
- Nagranie przechodzi 5 etapów, kończy się nowymi notatkami, aktualizuje dzisiejszy wpis i serię; błąd daje „Ponów przetwarzanie”.
- Filtry notatek i filtry grafu naprawdę zmieniają widok.
- Zmiana osobowości AI zmienia treść rady w otwartym wpisie.
- Czat zawsze zwraca źródła, a chipy źródeł otwierają właściwy element.
- Kontrast tekstu min. 4.5:1 w każdym motywie; cele dotykowe ≥ 44 pt (przyciski 40 px w prototypie powiększ polem dotyku `hitSlop`).

## 7. Czego prototyp celowo NIE rozstrzyga (zapytaj właściciela produktu)
Dokładne progi odznak; zasady liczenia serii (strefa czasowa, dni bez nagrań); polityka prywatności i przechowywania audio; limity długości nagrania; zakres wersji 1 (zegarek, eksport .md, udostępnianie story); sposób obliczania „zgodności z celami” i wskaźników stresu/spokoju.
