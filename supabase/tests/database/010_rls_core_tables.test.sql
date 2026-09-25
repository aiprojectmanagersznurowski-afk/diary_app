-- RLS: profiles, categories, recordings — użytkownik A nie widzi ani nie zmienia danych B.

begin;
  select plan(9);

  select tests.create_supabase_user('rls-core-a@test.local');
  select tests.create_supabase_user('rls-core-b@test.local');

  -- profiles
  select tests.authenticate_as('rls-core-a@test.local');
  insert into public.profiles (user_id, timezone) values (tests.get_supabase_uid('rls-core-a@test.local'), 'Europe/Warsaw');
  select tests.authenticate_as('rls-core-b@test.local');
  insert into public.profiles (user_id, timezone) values (tests.get_supabase_uid('rls-core-b@test.local'), 'Europe/Warsaw');

  select tests.authenticate_as('rls-core-a@test.local');

  -- DIAGNOSTYKA TYMCZASOWA: realne wartości, żeby znaleźć przyczynę "not ok" bez zgadywania.
  do $$
  begin
    raise notice 'DEBUG current_user=% session_user=%', current_user, session_user;
    raise notice 'DEBUG auth.uid()=%', auth.uid();
    raise notice 'DEBUG expected A uid=%', tests.get_supabase_uid('rls-core-a@test.local');
    raise notice 'DEBUG expected B uid=%', tests.get_supabase_uid('rls-core-b@test.local');
    raise notice 'DEBUG profiles total rows (bypasses RLS via count in plpgsql? no, same session)=%', (select count(*) from public.profiles);
  end $$;

  select results_eq(
    'select count(*) from public.profiles',
    array[1::bigint],
    'profiles: A widzi tylko swój wiersz'
  );
  select is_empty(
    format('update public.profiles set theme = ''hacked'' where user_id = %L returning 1', tests.get_supabase_uid('rls-core-b@test.local')),
    'profiles: A nie może zmienić profilu B'
  );
  select is_empty(
    format('delete from public.profiles where user_id = %L returning 1', tests.get_supabase_uid('rls-core-b@test.local')),
    'profiles: A nie może usunąć profilu B'
  );

  -- categories
  select tests.authenticate_as('rls-core-a@test.local');
  insert into public.categories (user_id, name) values (tests.get_supabase_uid('rls-core-a@test.local'), 'Praca');
  select tests.authenticate_as('rls-core-b@test.local');
  insert into public.categories (user_id, name) values (tests.get_supabase_uid('rls-core-b@test.local'), 'Praca');

  select tests.authenticate_as('rls-core-a@test.local');
  select results_eq(
    'select count(*) from public.categories',
    array[1::bigint],
    'categories: A widzi tylko swoją kategorię'
  );
  select is_empty(
    format('update public.categories set color = ''#000'' where user_id = %L returning 1', tests.get_supabase_uid('rls-core-b@test.local')),
    'categories: A nie może zmienić kategorii B'
  );
  select is_empty(
    format('delete from public.categories where user_id = %L returning 1', tests.get_supabase_uid('rls-core-b@test.local')),
    'categories: A nie może usunąć kategorii B'
  );

  -- recordings
  select tests.authenticate_as('rls-core-a@test.local');
  insert into public.recordings (id, user_id, source, recorded_at)
    values (gen_random_uuid(), tests.get_supabase_uid('rls-core-a@test.local'), 'phone', now());
  select tests.authenticate_as('rls-core-b@test.local');
  insert into public.recordings (id, user_id, source, recorded_at)
    values (gen_random_uuid(), tests.get_supabase_uid('rls-core-b@test.local'), 'phone', now());

  select tests.authenticate_as('rls-core-a@test.local');
  select results_eq(
    'select count(*) from public.recordings',
    array[1::bigint],
    'recordings: A widzi tylko swoje nagranie'
  );
  select is_empty(
    format('update public.recordings set status = ''failed'' where user_id = %L returning 1', tests.get_supabase_uid('rls-core-b@test.local')),
    'recordings: A nie może zmienić nagrania B'
  );
  select is_empty(
    format('delete from public.recordings where user_id = %L returning 1', tests.get_supabase_uid('rls-core-b@test.local')),
    'recordings: A nie może usunąć nagrania B'
  );

  select * from finish();
rollback;

