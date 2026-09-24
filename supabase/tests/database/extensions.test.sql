-- F1-01: rozszerzenia wymagane przez architekturę są włączone (docs/02-architektura.md §4).
-- supabase test db

begin;
  create extension if not exists pgtap with schema extensions;

  select plan(4);

  select has_extension('vector', 'pgvector jest włączony (embeddingi dokumentów)');
  select has_extension('pg_cron', 'pg_cron jest włączony (przebudowa wpisu dnia, ponawianie nagrań)');
  select has_extension('pg_net', 'pg_net jest włączony (webhook bazy -> Edge Function)');
  select has_extension('unaccent', 'unaccent jest włączony (fts bez polskiego słownika)');

  select * from finish();
rollback;
