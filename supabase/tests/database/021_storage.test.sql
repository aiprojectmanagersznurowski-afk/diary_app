-- Storage: buckety recordings/documents są prywatne, pierwszy segment ścieżki = auth.uid().
-- INSERT niezgodny z WITH CHECK rzuca błąd (inaczej niż UPDATE/DELETE, które po prostu nie
-- dopasowują wierszy) — stąd throws_ok zamiast is_empty dla prób zapisu w cudzym folderze.

begin;
  select plan(6);

  select tests.create_supabase_user('rls-storage-a@test.local');
  select tests.create_supabase_user('rls-storage-b@test.local');

  -- recordings bucket
  select tests.authenticate_as('rls-storage-a@test.local');
  insert into storage.objects (bucket_id, name)
    values ('recordings', tests.get_supabase_uid('rls-storage-a@test.local')::text || '/note.m4a');

  select tests.authenticate_as('rls-storage-b@test.local');
  select throws_ok(
    format(
      $$insert into storage.objects (bucket_id, name) values ('recordings', %L || '/hacked.m4a')$$,
      tests.get_supabase_uid('rls-storage-a@test.local')::text
    ),
    'recordings: B nie może zapisać w folderze A'
  );
  select results_eq(
    'select count(*) from storage.objects where bucket_id = ''recordings''',
    array[0::bigint],
    'recordings: B nie widzi plików A'
  );

  select tests.authenticate_as('rls-storage-a@test.local');
  select results_eq(
    'select count(*) from storage.objects where bucket_id = ''recordings''',
    array[1::bigint],
    'recordings: A widzi swój plik'
  );

  -- documents bucket
  select tests.authenticate_as('rls-storage-a@test.local');
  insert into storage.objects (bucket_id, name)
    values ('documents', tests.get_supabase_uid('rls-storage-a@test.local')::text || '/notes/note.md');

  select tests.authenticate_as('rls-storage-b@test.local');
  select throws_ok(
    format(
      $$insert into storage.objects (bucket_id, name) values ('documents', %L || '/hacked.md')$$,
      tests.get_supabase_uid('rls-storage-a@test.local')::text
    ),
    'documents: B nie może zapisać w folderze A'
  );
  select results_eq(
    'select count(*) from storage.objects where bucket_id = ''documents''',
    array[0::bigint],
    'documents: B nie widzi plików A'
  );

  select tests.authenticate_as('rls-storage-a@test.local');
  select results_eq(
    'select count(*) from storage.objects where bucket_id = ''documents''',
    array[1::bigint],
    'documents: A widzi swój plik'
  );

  do $$ begin raise notice 'DEBUG 021_storage reached finish()'; end $$;
  select * from finish();
rollback;

