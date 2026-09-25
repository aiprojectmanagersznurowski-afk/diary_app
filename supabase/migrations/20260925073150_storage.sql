-- Storage buckets: docs/02-architektura.md §4 „Storage". Prywatne, ścieżka {user_id}/...
-- Polityki na storage.objects: pierwszy segment ścieżki musi być równy auth.uid().
-- RLS na storage.objects jest już włączone przez Supabase — nie ruszamy tego tutaj.

insert into storage.buckets (id, name, public)
values
  ('recordings', 'recordings', false),
  ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "select own recordings objects" on storage.objects
  for select using (
    bucket_id = 'recordings'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "insert own recordings objects" on storage.objects
  for insert with check (
    bucket_id = 'recordings'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "update own recordings objects" on storage.objects
  for update using (
    bucket_id = 'recordings'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'recordings'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "delete own recordings objects" on storage.objects
  for delete using (
    bucket_id = 'recordings'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "select own documents objects" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "insert own documents objects" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "update own documents objects" on storage.objects
  for update using (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "delete own documents objects" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
