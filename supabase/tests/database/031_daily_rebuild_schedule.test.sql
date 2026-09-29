-- Testy pgTAP dla F3-01: Harmonogram pg_cron i RPC żądania przebudowy wpisu dnia
-- docs/02-architektura.md §6.3, §9

begin;
  select plan(8);

  -- Konfiguracja testowa w app.settings (symulacja sekretu z Vault)
  select set_config('app.settings.build_daily_url', 'http://127.0.0.1:54321/functions/v1/build-daily', true);
  select set_config('app.settings.build_daily_auth', 'test-build-daily-key', true);

  -- Test 1: get_build_daily_config zwraca poprawną konfigurację. Wywołane PRZED authenticate_as
  -- (czyli jako postgres) — funkcja ma `revoke execute ... from public, anon, authenticated`
  -- (ujawnia sekret auth_header), więc jako zwykły zalogowany użytkownik zawsze zwróci błąd uprawnień.
  select results_eq(
    $$select func_url, auth_header from public.get_build_daily_config()$$,
    $$values ('http://127.0.0.1:54321/functions/v1/build-daily'::text, 'Bearer test-build-daily-key'::text)$$,
    'get_build_daily_config zwraca poprawny URL i nagłówek autoryzacji'
  );

  -- Przygotowanie użytkownika testowego
  select tests.create_supabase_user('daily-rebuild@test.local');
  select tests.authenticate_as('daily-rebuild@test.local');

  -- Test 2: request_daily_rebuild wstawia wiersz do day_rebuild_queue dla wywołującego użytkownika
  do $$
  begin
    perform public.request_daily_rebuild('2026-09-29'::date);
  end;
  $$;

  select is(
    (select count(*)::int from public.day_rebuild_queue
      where user_id = tests.get_supabase_uid('daily-rebuild@test.local') and day = '2026-09-29'::date),
    1,
    'request_daily_rebuild wstawia dokładnie jeden wiersz dla wywołującego użytkownika i dnia'
  );

  -- Test 3: request_daily_rebuild wywołuje pg_net (wpis w net.http_request_queue)
  select is(
    (select count(*)::int from net.http_request_queue where url = 'http://127.0.0.1:54321/functions/v1/build-daily'),
    1,
    'request_daily_rebuild wywołuje pg_net (wpis w net.http_request_queue)'
  );

  -- Test 4: ponowne wywołanie dla tego samego dnia aktualizuje wiersz zamiast go duplikować
  do $$
  begin
    perform public.request_daily_rebuild('2026-09-29'::date);
  end;
  $$;

  select is(
    (select count(*)::int from public.day_rebuild_queue
      where user_id = tests.get_supabase_uid('daily-rebuild@test.local')),
    1,
    'ponowne request_daily_rebuild dla tego samego dnia nie duplikuje wiersza (UPSERT)'
  );

  -- Powrót do roli postgres: rebuild_due_daily_entries i cron.job są niedostępne dla authenticated.
  reset role;

  -- Test 5: przygotowanie utkniętego wpisu (sprzed 15 minut, poza progiem odczekania 10 minut)
  -- oraz świeżego wpisu z Testu 2 (sprzed chwili, poniżej progu) — rebuild_due_daily_entries ma
  -- wybrać tylko ten utknięty.
  do $$
  declare
    uid uuid := tests.get_supabase_uid('daily-rebuild@test.local');
  begin
    insert into public.day_rebuild_queue (user_id, day, requested_at)
    values (uid, '2026-09-01'::date, now() - interval '15 minutes');
  end;
  $$;

  select results_eq(
    $$select user_id, day from public.rebuild_due_daily_entries(interval '10 minutes') order by day$$,
    $$select tests.get_supabase_uid('daily-rebuild@test.local'), '2026-09-01'::date$$,
    'rebuild_due_daily_entries wybiera tylko wpis starszy niż próg odczekania'
  );

  -- Test 6: rebuild_due_daily_entries wywołało pg_net dla utkniętego wpisu (trzeci wpis w kolejce:
  -- Test 2 i Test 4 to dwa wywołania request_daily_rebuild, które za każdym razem wołają pg_net
  -- bezwarunkowo — "na żądanie" ma działać przy każdym otwarciu dzisiejszego wpisu, nie tylko raz).
  select is(
    (select count(*)::int from net.http_request_queue where url = 'http://127.0.0.1:54321/functions/v1/build-daily'),
    3,
    'rebuild_due_daily_entries dodaje kolejny wpis do net.http_request_queue dla utkniętego dnia'
  );

  -- Test 7: świeży wpis z Testu 2/4 nadal istnieje w kolejce (nie został usunięty ani ruszony)
  select is(
    (select count(*)::int from public.day_rebuild_queue
      where user_id = tests.get_supabase_uid('daily-rebuild@test.local') and day = '2026-09-29'::date),
    1,
    'świeży wpis w day_rebuild_queue pozostaje nietknięty po rebuild_due_daily_entries'
  );

  -- Test 8: Rejestracja zadania w cron.job
  select ok(
    exists(select 1 from cron.job where jobname = 'rebuild-due-daily-entries'),
    'Zadanie rebuild-due-daily-entries jest zarejestrowane w cron.job'
  );

  select * from finish();
rollback;
