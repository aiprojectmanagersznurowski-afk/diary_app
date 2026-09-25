# Warstwa Infrastruktury (Infrastructure)

Warstwa odpowiedzialna za integracje z usługami zewnętrznymi, bazą danych i sprzętem:
- **Baza danych i Auth**: Klient Supabase (`@supabase/supabase-js`) oraz implementacje repozytoriów (`SupabaseAuthRepository`, `SupabaseProfileRepository`).
- **Dźwięk**: Nagrywanie audio zoptymalizowane pod mowę przez oficjalny moduł `expo-audio`.
- **Sztuczna Inteligencja**: Integracja z modelami AI (Groq API, docelowo Edge Functions Supabase).

Zgodnie z Clean Architecture warstwa ta może importować z `domain`, `application` oraz `infrastructure`.
Ekrany z warstwy `presentation` nie mogą importować z tej warstwy bezpośrednio — powiązanie odbywa się w composition root (`src/composition/`).
