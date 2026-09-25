# Warstwa Aplikacji (Application)

Warstwa logiki biznesowej i przypadków użycia:
- **Przypadki użycia (`useCases/`)**: Autoryzacja, zarządzanie profilem, przetwarzanie wpisów pamiętnika.
- **Store'y stanu (`store/`)**: Zarządzanie stanem aplikacji za pomocą Zustand (`useAuthStore`, `useSettingsStore`, `useGamificationStore`, `useDiaryStore`).

Zgodnie z Clean Architecture:
- Warstwa ta może importować z `domain` oraz `application`.
- ZAKAZ importów z `infrastructure` oraz `presentation`.
