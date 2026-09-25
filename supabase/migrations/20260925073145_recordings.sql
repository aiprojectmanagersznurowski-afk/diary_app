-- recordings: docs/02-architektura.md §4, §6.1 (nagranie), §9 (niezawodność).
-- `id` jest generowane przez klienta/zegarek (UUID) — klucz idempotencji, dlatego bez wartości
-- domyślnej: wstawiający musi podać własny UUID.

create table public.recordings (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('phone', 'watch', 'web')),
  recorded_at timestamptz not null,
  duration_ms int,
  audio_path text,
  raw_transcript text,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'transcribed', 'segmented', 'done', 'failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

alter table public.recordings enable row level security;

create policy "select own recordings" on public.recordings
  for select using (user_id = (select auth.uid()));

create policy "insert own recordings" on public.recordings
  for insert with check (user_id = (select auth.uid()));

create policy "update own recordings" on public.recordings
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own recordings" on public.recordings
  for delete using (user_id = (select auth.uid()));
