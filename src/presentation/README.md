# Warstwa Prezentacji (Presentation)

Warstwa interfejsu użytkownika aplikacji mobilnej React Native (Expo):
- **Ekrany (`screens/`)**: Ekrany logowania, onboardingu, strony głównej, szczegółów wpisów, statystyk i ustawień.
- **Komponenty (`components/`)**: Reużywalne elementy UI, karty, kontrolki nagrywania, modale odznak.

Zgodnie z Clean Architecture:
- Warstwa prezentacji może importować z `domain`, `application` oraz `presentation`.
- ZAKAZ bezpośrednich importów z `infrastructure/` — komponenty korzystają ze store'ów aplikacji oraz serwisów zdefiniowanych w composition root (`src/composition/`).
