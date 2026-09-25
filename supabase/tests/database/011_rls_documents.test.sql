-- RLS: documents, document_chunks — użytkownik A nie widzi ani nie zmienia danych B.

begin;
  select plan(6);

  select tests.create_supabase_user('rls-doc-a@test.local');
  select tests.create_supabase_user('rls-doc-b@test.local');

  select tests.authenticate_as('rls-doc-a@test.local');
  insert into public.documents (user_id, kind, day, title, slug)
    values (tests.get_supabase_uid('rls-doc-a@test.local'), 'note', current_date, 'Notatka A', 'notatka-a');

  select tests.authenticate_as('rls-doc-b@test.local');
  insert into public.documents (user_id, kind, day, title, slug)
    values (tests.get_supabase_uid('rls-doc-b@test.local'), 'note', current_date, 'Notatka B', 'notatka-b');

  select tests.authenticate_as('rls-doc-a@test.local');
  select results_eq(
    'select count(*) from public.documents',
    array[1::bigint],
    'documents: A widzi tylko swój dokument'
  );
  select is_empty(
    format('update public.documents set title = ''hacked'' where user_id = %L returning 1', tests.get_supabase_uid('rls-doc-b@test.local')),
    'documents: A nie może zmienić dokumentu B'
  );
  select is_empty(
    format('delete from public.documents where user_id = %L returning 1', tests.get_supabase_uid('rls-doc-b@test.local')),
    'documents: A nie może usunąć dokumentu B'
  );

  -- document_chunks: po jednym chunku do dokumentu A i do dokumentu B
  select tests.authenticate_as('rls-doc-a@test.local');
  insert into public.document_chunks (document_id, user_id, idx, content)
    select id, user_id, 0, 'treść A' from public.documents where slug = 'notatka-a';

  select tests.authenticate_as('rls-doc-b@test.local');
  insert into public.document_chunks (document_id, user_id, idx, content)
    select id, user_id, 0, 'treść B' from public.documents where slug = 'notatka-b';

  select tests.authenticate_as('rls-doc-a@test.local');
  select results_eq(
    'select count(*) from public.document_chunks',
    array[1::bigint],
    'document_chunks: A widzi tylko swój fragment'
  );
  select is_empty(
    format('update public.document_chunks set content = ''hacked'' where user_id = %L returning 1', tests.get_supabase_uid('rls-doc-b@test.local')),
    'document_chunks: A nie może zmienić fragmentu B'
  );
  select is_empty(
    format('delete from public.document_chunks where user_id = %L returning 1', tests.get_supabase_uid('rls-doc-b@test.local')),
    'document_chunks: A nie może usunąć fragmentu B'
  );

  select * from finish();
rollback;

