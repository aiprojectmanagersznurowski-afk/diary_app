-- documents + document_chunks: docs/02-architektura.md §4.
-- fts: konfiguracja 'simple' + unaccent (brak polskiego słownika). unaccent(text) o jednym argumencie
-- jest STABLE, nie IMMUTABLE (zależy od search_path), więc kolumna generowana wymaga owiniętej,
-- jawnie zakwalifikowanej wersji z dwuargumentowym unaccent(regdictionary, text) — standardowy wzorzec
-- Postgresa dla tego dokładnego problemu.

create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1);
$$;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('note', 'daily')),
  note_type text check (note_type is null or note_type in ('idea', 'task', 'reflection', 'event')),
  day date not null,
  title text not null,
  slug text not null,
  data jsonb not null default '{}',
  body_md text,
  md_path text,
  category_id uuid references public.categories (id) on delete set null,
  tags text[] not null default '{}',
  recording_id uuid references public.recordings (id) on delete set null,
  schema_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint documents_note_type_only_for_note check (note_type is null or kind = 'note'),
  unique (user_id, slug)
);

-- Jeden wpis dnia na dzień na użytkownika; wiele notatek może mieć ten sam `day`.
create unique index documents_one_daily_per_day on public.documents (user_id, day) where kind = 'daily';

create index documents_user_day on public.documents (user_id, day);
create index documents_user_kind on public.documents (user_id, kind);

alter table public.documents enable row level security;

create policy "select own documents" on public.documents
  for select using (user_id = (select auth.uid()));

create policy "insert own documents" on public.documents
  for insert with check (user_id = (select auth.uid()));

create policy "update own documents" on public.documents
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own documents" on public.documents
  for delete using (user_id = (select auth.uid()));

create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  idx int not null,
  content text not null,
  embedding extensions.vector(1536),
  embedding_model text,
  fts tsvector generated always as (
    to_tsvector('simple', public.immutable_unaccent(coalesce(content, '')))
  ) stored,

  unique (document_id, idx)
);

create index document_chunks_embedding_hnsw
  on public.document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create index document_chunks_fts on public.document_chunks using gin (fts);

alter table public.document_chunks enable row level security;

create policy "select own document_chunks" on public.document_chunks
  for select using (user_id = (select auth.uid()));

create policy "insert own document_chunks" on public.document_chunks
  for insert with check (user_id = (select auth.uid()));

create policy "update own document_chunks" on public.document_chunks
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own document_chunks" on public.document_chunks
  for delete using (user_id = (select auth.uid()));
