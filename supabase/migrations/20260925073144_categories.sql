-- categories: docs/02-architektura.md §4.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;

create policy "select own categories" on public.categories
  for select using (user_id = (select auth.uid()));

create policy "insert own categories" on public.categories
  for insert with check (user_id = (select auth.uid()));

create policy "update own categories" on public.categories
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own categories" on public.categories
  for delete using (user_id = (select auth.uid()));
