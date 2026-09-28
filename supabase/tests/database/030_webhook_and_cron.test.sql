-- Testy pgTAP dla F2-06: Webhook bazy i ponawianie przez pg_cron
-- docs/02-architektura.md §6.1, §9

begin;
  select plan(9);

  -- Konfiguracja testowa w app.settings (symulacja sekretu z Vault)
  select set_config('app.settings.process_recording_url', 'http://127.0.0.1:54321/functions/v1/process-recording', true);
  select set_config('app.settings.process_recording_auth', 'test-auth-key-123', true);

  -- Test 1: get_process_recording_config zwraca poprawną konfigurację. Wywołane PRZED
  -- authenticate_as (czyli jako postgres, nie authenticated) — funkcja celowo ma
  -- `revoke execute ... from public, anon, authenticated` (ujawnia sekret auth_header),
  -- więc wywołanie jej jako zwykły zalogowany użytkownik zawsze zwróci "permission denied".
  select results_eq(
    $$select func_url, auth_header from public.get_process_recording_config()$$,
    $$values ('http://127.0.0.1:54321/functions/v1/process-recording'::text, 'Bearer test-auth-key-123'::text)$$,
    'get_process_recording_config zwraca poprawny URL i nagłówek autoryzacji'
  );

  -- 1b. Przygotowanie użytkownika testowego dla pozostałych testów (insert recordings jako authenticated)
  select tests.create_supabase_user('webhook-cron@test.local');
  select tests.authenticate_as('webhook-cron@test.local');

  -- Test 2: INSERT recordings (status uploaded) dodaje wpis do net.http_request_queue
  do $$
  declare
    uid uuid := tests.get_supabase_uid('webhook-cron@test.local');
    rec_id uuid := gen_random_uuid();
  begin
    insert into public.recordings (id, user_id, source, recorded_at, status)
    values (rec_id, uid, 'phone', now(), 'uploaded');
  end;
  $$;

  select is(
    (select count(*)::int from net.http_request_queue where url = 'http://127.0.0.1:54321/functions/v1/process-recording'),
    1,
    'INSERT recordings ze statusem uploaded wywołuje pg_net (wpis w net.http_request_queue)'
  );

  -- Test 3: INSERT recordings ze statusem innym niż uploaded nie dodaje kolejnego wpisu
  do $$
  declare
    uid uuid := tests.get_supabase_uid('webhook-cron@test.local');
    rec_id uuid := gen_random_uuid();
  begin
    insert into public.recordings (id, user_id, source, recorded_at, status)
    values (rec_id, uid, 'phone', now(), 'done');
  end;
  $$;

  select is(
    (select count(*)::int from net.http_request_queue where url = 'http://127.0.0.1:54321/functions/v1/process-recording'),
    1,
    'INSERT recordings ze statusem done nie wywołuje pg_net'
  );

  -- Test 4: retry_stuck_recordings wybiera tylko właściwe nagrania
  -- Przygotowujemy zestaw danych testowych o różnym wieku, statusie i liczbie prób
  do $$
  declare
    uid uuid := tests.get_supabase_uid('webhook-cron@test.local');
  begin
    -- 1. Utknięte nagranie (status uploaded, 0 prób, sprzed 10 minut) -> POWINNO być ponowione
    insert into public.recordings (id, user_id, source, recorded_at, status, attempts, created_at)
    values ('11111111-1111-1111-1111-111111111111', uid, 'phone', now() - interval '10 minutes', 'uploaded', 0, now() - interval '10 minutes');

    -- 2. Utknięte nagranie (status transcribed, 1 próba, sprzed 6 minut) -> POWINNO być ponowione
    insert into public.recordings (id, user_id, source, recorded_at, status, attempts, created_at)
    values ('22222222-2222-2222-2222-222222222222', uid, 'watch', now() - interval '6 minutes', 'transcribed', 1, now() - interval '6 minutes');

    -- 3. Nagranie zakończone sukcesem (done) -> NIE powinno być ponawiane
    insert into public.recordings (id, user_id, source, recorded_at, status, attempts, created_at)
    values ('33333333-3333-3333-3333-333333333333', uid, 'phone', now() - interval '10 minutes', 'done', 0, now() - interval '10 minutes');

    -- 4. Nagranie nieudane (failed) -> NIE powinno być ponawiane
    insert into public.recordings (id, user_id, source, recorded_at, status, attempts, created_at)
    values ('44444444-4444-4444-4444-444444444444', uid, 'web', now() - interval '10 minutes', 'failed', 1, now() - interval '10 minutes');

    -- 5. Nagranie z osiągniętym limitem prób (attempts = 3 przy limicie 3) -> NIE powinno być ponawiane
    insert into public.recordings (id, user_id, source, recorded_at, status, attempts, created_at)
    values ('55555555-5555-5555-5555-555555555555', uid, 'phone', now() - interval '10 minutes', 'uploaded', 3, now() - interval '10 minutes');

    -- 6. Świeże nagranie (sprzed 1 minuty przy progu 5 min) -> NIE powinno być ponawiane
    insert into public.recordings (id, user_id, source, recorded_at, status, attempts, created_at)
    values ('66666666-6666-6666-6666-666666666666', uid, 'phone', now() - interval '1 minute', 'uploaded', 0, now() - interval '1 minute');
  end;
  $$;

  -- Wywołujemy retry_stuck_recordings z progiem 5 minut i limitem 3 prób
  select results_eq(
    $$select recording_id, attempts from public.retry_stuck_recordings(interval '5 minutes', 3) order by recording_id$$,
    $$values
      ('11111111-1111-1111-1111-111111111111'::uuid, 1),
      ('22222222-2222-2222-2222-222222222222'::uuid, 2)
    $$,
    'retry_stuck_recordings ponawia dokładnie te 2 nagrania, które utknęły i są poniżej limitu prób'
  );

  -- Weryfikujemy stan bazy po retry
  select is(
    (select attempts from public.recordings where id = '11111111-1111-1111-1111-111111111111'),
    1,
    'Nagranie 1 ma zwiększone attempts do 1'
  );

  select is(
    (select attempts from public.recordings where id = '22222222-2222-2222-2222-222222222222'),
    2,
    'Nagranie 2 ma zwiększone attempts do 2'
  );

  select is(
    (select attempts from public.recordings where id = '55555555-5555-5555-5555-555555555555'),
    3,
    'Nagranie z limitem prób nie zostało ruszone'
  );

  select is(
    (select attempts from public.recordings where id = '66666666-6666-6666-6666-666666666666'),
    0,
    'Świeże nagranie nie zostało ruszone'
  );

  -- Test 5: Rejestracja zadania w cron.job
  select ok(
    exists(select 1 from cron.job where jobname = 'retry-stuck-recordings'),
    'Zadanie retry-stuck-recordings jest zarejestrowane w cron.job'
  );

  select * from finish();
rollback;
