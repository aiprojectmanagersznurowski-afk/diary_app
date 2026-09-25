-- RLS: links, day_rebuild_queue, chat_threads, chat_messages — A nie widzi ani nie zmienia danych B.

begin;
  select plan(12);

  select tests.create_supabase_user('rls-rel-a@test.local');
  select tests.create_supabase_user('rls-rel-b@test.local');

  -- links: potrzebne po dwa dokumenty na użytkownika (source, target)
  select tests.authenticate_as('rls-rel-a@test.local');
  insert into public.documents (user_id, kind, day, title, slug) values
    (tests.get_supabase_uid('rls-rel-a@test.local'), 'note', current_date, 'A1', 'rel-a1'),
    (tests.get_supabase_uid('rls-rel-a@test.local'), 'note', current_date, 'A2', 'rel-a2');
  insert into public.links (user_id, source_id, target_id, kind)
    select tests.get_supabase_uid('rls-rel-a@test.local'), s.id, t.id, 'manual'
    from public.documents s, public.documents t
    where s.slug = 'rel-a1' and t.slug = 'rel-a2';

  select tests.authenticate_as('rls-rel-b@test.local');
  insert into public.documents (user_id, kind, day, title, slug) values
    (tests.get_supabase_uid('rls-rel-b@test.local'), 'note', current_date, 'B1', 'rel-b1'),
    (tests.get_supabase_uid('rls-rel-b@test.local'), 'note', current_date, 'B2', 'rel-b2');
  insert into public.links (user_id, source_id, target_id, kind)
    select tests.get_supabase_uid('rls-rel-b@test.local'), s.id, t.id, 'manual'
    from public.documents s, public.documents t
    where s.slug = 'rel-b1' and t.slug = 'rel-b2';

  select tests.authenticate_as('rls-rel-a@test.local');
  do $$ begin raise notice 'DEBUG links count=% docs count=%', (select count(*) from public.links), (select count(*) from public.documents); end $$;
  select results_eq(
    'select count(*) from public.links',
    array[1::bigint],
    'links: A widzi tylko swoje powiązanie'
  );
  select is_empty(
    format('update public.links set reason = ''hacked'' where user_id = %L returning 1', tests.get_supabase_uid('rls-rel-b@test.local')),
    'links: A nie może zmienić powiązania B'
  );
  select is_empty(
    format('delete from public.links where user_id = %L returning 1', tests.get_supabase_uid('rls-rel-b@test.local')),
    'links: A nie może usunąć powiązania B'
  );

  -- day_rebuild_queue
  select tests.authenticate_as('rls-rel-a@test.local');
  insert into public.day_rebuild_queue (user_id, day) values (tests.get_supabase_uid('rls-rel-a@test.local'), current_date);
  select tests.authenticate_as('rls-rel-b@test.local');
  insert into public.day_rebuild_queue (user_id, day) values (tests.get_supabase_uid('rls-rel-b@test.local'), current_date);

  select tests.authenticate_as('rls-rel-a@test.local');
  do $$ begin raise notice 'DEBUG day_rebuild_queue count=%', (select count(*) from public.day_rebuild_queue); end $$;
  select results_eq(
    'select count(*) from public.day_rebuild_queue',
    array[1::bigint],
    'day_rebuild_queue: A widzi tylko swój wpis'
  );
  select is_empty(
    format('update public.day_rebuild_queue set requested_at = now() where user_id = %L returning 1', tests.get_supabase_uid('rls-rel-b@test.local')),
    'day_rebuild_queue: A nie może zmienić wpisu B'
  );
  select is_empty(
    format('delete from public.day_rebuild_queue where user_id = %L returning 1', tests.get_supabase_uid('rls-rel-b@test.local')),
    'day_rebuild_queue: A nie może usunąć wpisu B'
  );

  -- chat_threads
  select tests.authenticate_as('rls-rel-a@test.local');
  insert into public.chat_threads (user_id, title) values (tests.get_supabase_uid('rls-rel-a@test.local'), 'Wątek A');
  select tests.authenticate_as('rls-rel-b@test.local');
  insert into public.chat_threads (user_id, title) values (tests.get_supabase_uid('rls-rel-b@test.local'), 'Wątek B');

  select tests.authenticate_as('rls-rel-a@test.local');
  select results_eq(
    'select count(*) from public.chat_threads',
    array[1::bigint],
    'chat_threads: A widzi tylko swój wątek'
  );
  select is_empty(
    format('update public.chat_threads set title = ''hacked'' where user_id = %L returning 1', tests.get_supabase_uid('rls-rel-b@test.local')),
    'chat_threads: A nie może zmienić wątku B'
  );
  select is_empty(
    format('delete from public.chat_threads where user_id = %L returning 1', tests.get_supabase_uid('rls-rel-b@test.local')),
    'chat_threads: A nie może usunąć wątku B'
  );

  -- chat_messages
  select tests.authenticate_as('rls-rel-a@test.local');
  insert into public.chat_messages (thread_id, user_id, role, content)
    select id, user_id, 'user', 'Pytanie A' from public.chat_threads where title = 'Wątek A';
  select tests.authenticate_as('rls-rel-b@test.local');
  insert into public.chat_messages (thread_id, user_id, role, content)
    select id, user_id, 'user', 'Pytanie B' from public.chat_threads where title = 'Wątek B';

  select tests.authenticate_as('rls-rel-a@test.local');
  select results_eq(
    'select count(*) from public.chat_messages',
    array[1::bigint],
    'chat_messages: A widzi tylko swoją wiadomość'
  );
  select is_empty(
    format('update public.chat_messages set content = ''hacked'' where user_id = %L returning 1', tests.get_supabase_uid('rls-rel-b@test.local')),
    'chat_messages: A nie może zmienić wiadomości B'
  );
  select is_empty(
    format('delete from public.chat_messages where user_id = %L returning 1', tests.get_supabase_uid('rls-rel-b@test.local')),
    'chat_messages: A nie może usunąć wiadomości B'
  );

  do $$ begin raise notice 'DEBUG 012_rls_relations_and_chat reached finish()'; end $$;
  select * from finish();
rollback;

