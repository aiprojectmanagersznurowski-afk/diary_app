-- Migration: 20261008120000_user_context_and_round_table.sql
-- Faza 10: Kontekst użytkownika (User Context Files), Narrator i Okrągły stół (ADR-011)

-- 1. Rozszerzenie profiles o skład Okrągłego stołu
alter table public.profiles
  add column if not exists round_table_members text[] not null default array['friend', 'banach', 'deida', 'huberman']::text[];

-- 2. Tabela plików kontekstu użytkownika (IDENTITY.md, VALUES.md, GOALS.md, RELATIONS.md, DILEMMAS.md, MEMORY.md)
create table if not exists public.user_context_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  content text not null default '',
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, filename)
);

alter table public.user_context_files enable row level security;

create policy "select own user_context_files" on public.user_context_files
  for select using (user_id = (select auth.uid()));

create policy "insert own user_context_files" on public.user_context_files
  for insert with check (user_id = (select auth.uid()));

create policy "update own user_context_files" on public.user_context_files
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own user_context_files" on public.user_context_files
  for delete using (user_id = (select auth.uid()));

-- 3. Tabela propozycji aktualizacji kontekstu (wyciąganych z wpisów dziennych)
create table if not exists public.user_context_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  section text not null,
  action text not null, -- 'add' | 'update' | 'remove'
  diff_content text not null,
  source_quote text,
  source_document_id uuid references public.documents (id) on delete set null,
  confidence real not null default 0.8,
  status text not null default 'pending', -- 'pending' | 'applied' | 'rejected'
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_user_context_proposals_user_status
  on public.user_context_proposals (user_id, status);

alter table public.user_context_proposals enable row level security;

create policy "select own user_context_proposals" on public.user_context_proposals
  for select using (user_id = (select auth.uid()));

create policy "insert own user_context_proposals" on public.user_context_proposals
  for insert with check (user_id = (select auth.uid()));

create policy "update own user_context_proposals" on public.user_context_proposals
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own user_context_proposals" on public.user_context_proposals
  for delete using (user_id = (select auth.uid()));

-- 4. Tabela rekomendacji Okrągłego stołu dla notatek z kategorii 'Dylematy'
create table if not exists public.user_dilemma_advisories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  problem_core text not null,
  root_causes text,
  recommendations jsonb not null default '[]'::jsonb,
  narrator_synthesis jsonb,
  user_decision text,
  crisis_detected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, document_id)
);

create index if not exists idx_user_dilemma_advisories_doc
  on public.user_dilemma_advisories (document_id);

alter table public.user_dilemma_advisories enable row level security;

create policy "select own user_dilemma_advisories" on public.user_dilemma_advisories
  for select using (user_id = (select auth.uid()));

create policy "insert own user_dilemma_advisories" on public.user_dilemma_advisories
  for insert with check (user_id = (select auth.uid()));

create policy "update own user_dilemma_advisories" on public.user_dilemma_advisories
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own user_dilemma_advisories" on public.user_dilemma_advisories
  for delete using (user_id = (select auth.uid()));
