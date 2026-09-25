-- profiles: docs/02-architektura.md §4. Jeden wiersz na użytkownika, tworzony po stronie klienta
-- (F1-04), nie triggerem tutaj — poza zakresem F1-02.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  life_goals text[] not null default '{}',
  ai_personality text,
  theme text,
  timezone text not null,
  current_streak int not null default 0,
  last_entry_day date,
  badges text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "select own profile" on public.profiles
  for select using (user_id = (select auth.uid()));

create policy "insert own profile" on public.profiles
  for insert with check (user_id = (select auth.uid()));

create policy "update own profile" on public.profiles
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own profile" on public.profiles
  for delete using (user_id = (select auth.uid()));
