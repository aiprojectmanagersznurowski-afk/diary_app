-- Rozszerzenia wymagane przez architekturę (docs/02-architektura.md §4, §5):
--   vector   — embeddingi dokumentów (pgvector), indeks HNSW w kolejnych migracjach
--   pg_cron  — pg_cron: przebudowa wpisu dnia, ponawianie utkniętych nagrań (docs/02 §6.1, §6.3)
--   pg_net   — asynchroniczne wywołania HTTP z bazy (webhook -> Edge Function)
--   unaccent — wyszukiwanie pełnotekstowe bez polskiego słownika (docs/02 §4, kolumna fts)
--
-- Wszystkie instalowane do schematu `extensions`, zgodnie z konwencją Supabase (nie `public`).
-- pg_cron i pg_net tworzą też własne schematy (`cron`, `net`) niezależnie od klauzuli WITH SCHEMA
-- — to zachowanie samych rozszerzeń, nie tej migracji.
--
-- Uwaga dla człowieka wykonującego CP-MIGRATION („supabase db push"): na części projektów
-- hostowanych Supabase pg_cron/pg_net historycznie wymagały włączenia najpierw przez Dashboard
-- (Database > Extensions), zanim migracja mogła ich dotknąć. Jeśli `db push` odrzuci te dwie
-- linie z błędem uprawnień, włącz je w Dashboardzie i uruchom migrację ponownie — `if not exists`
-- sprawi, że reszta przejdzie bez zmian.

create extension if not exists vector with schema extensions;
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists unaccent with schema extensions;
