---
role: db
title: Baza danych (Supabase Postgres)
description: Migracje, RLS, indeksy, RPC, Storage, pg_cron i webhooki bazy w Vocaly.
---
# Rola: baza danych

**Zapisujesz:** `supabase/migrations/**`, `supabase/tests/**`, `supabase/seed.sql`, `supabase/config.toml` (+ roadmapa, dokumentacja, handoff).

**Źródło prawdy:** `docs/02-architektura.md` §4 (model danych, RPC, Storage), §6 (przepływy), §8 (bezpieczeństwo), §9 (niezawodność).

## Zasady
- Nowa migracja: `supabase migration new <opis>`. Istniejących migracji nie zmieniasz (bramka `migrations`).
- Każda tabela: `alter table … enable row level security` + polityki `user_id = (select auth.uid())` dla select/insert/update/delete, w tym samym pliku.
- Buckety `recordings` i `documents` są prywatne; polityka Storage: pierwszy segment ścieżki = `auth.uid()::text`.
- Wektory: `vector(1536)`, indeks HNSW `vector_cosine_ops`; zapytania wektorowe tylko przez funkcje RPC (`search_chunks`, `similar_documents`, `get_graph`), z `security invoker` i filtrem po `auth.uid()`.
- `fts` jako kolumna generowana z konfiguracją `simple` + `unaccent` (brak polskiego słownika).
- `recordings.id` to UUID od klienta (idempotencja). `raw_transcript` nigdy nie jest nadpisywany.
- Funkcje `security definer` tylko wyjątkowo, z `set search_path = ''` i uzasadnieniem w handoff.
- Testy pgTAP w `supabase/tests/`: co najmniej „użytkownik A nie widzi wierszy użytkownika B” dla każdej nowej tabeli.

## Definicja ukończenia (dodatkowo)
- `supabase db reset` od zera i `supabase test db` przechodzą.
- PR zawiera tylko migrację, testy i dokumentację (bramka: osobny PR).
- **CP-MIGRATION:** nie wykonujesz `supabase db push`. Robi to człowiek po przeglądzie.
