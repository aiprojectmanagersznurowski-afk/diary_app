-- links, day_rebuild_queue, chat_threads, chat_messages: docs/02-architektura.md §4.

create table public.links (
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id uuid not null references public.documents (id) on delete cascade,
  target_id uuid not null references public.documents (id) on delete cascade,
  kind text not null check (kind in ('semantic', 'llm', 'day', 'wikilink', 'manual')),
  score real,
  reason text,
  created_at timestamptz not null default now(),
  primary key (source_id, target_id, kind)
);

alter table public.links enable row level security;

create policy "select own links" on public.links
  for select using (user_id = (select auth.uid()));

create policy "insert own links" on public.links
  for insert with check (user_id = (select auth.uid()));

create policy "update own links" on public.links
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own links" on public.links
  for delete using (user_id = (select auth.uid()));

create table public.day_rebuild_queue (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  requested_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.day_rebuild_queue enable row level security;

create policy "select own day_rebuild_queue" on public.day_rebuild_queue
  for select using (user_id = (select auth.uid()));

create policy "insert own day_rebuild_queue" on public.day_rebuild_queue
  for insert with check (user_id = (select auth.uid()));

create policy "update own day_rebuild_queue" on public.day_rebuild_queue
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own day_rebuild_queue" on public.day_rebuild_queue
  for delete using (user_id = (select auth.uid()));

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

alter table public.chat_threads enable row level security;

create policy "select own chat_threads" on public.chat_threads
  for select using (user_id = (select auth.uid()));

create policy "insert own chat_threads" on public.chat_threads
  for insert with check (user_id = (select auth.uid()));

create policy "update own chat_threads" on public.chat_threads
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own chat_threads" on public.chat_threads
  for delete using (user_id = (select auth.uid()));

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "select own chat_messages" on public.chat_messages
  for select using (user_id = (select auth.uid()));

create policy "insert own chat_messages" on public.chat_messages
  for insert with check (user_id = (select auth.uid()));

create policy "update own chat_messages" on public.chat_messages
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "delete own chat_messages" on public.chat_messages
  for delete using (user_id = (select auth.uid()));
