-- Migracja: harmonogram pg_cron i RPC żądania przebudowy wpisu dnia (F3-01)
-- Zgodnie z docs/02-architektura.md §6.3, §9 oraz wytycznymi F3-01.
-- Brak wpisanych sekretów: URL i klucz Edge Function build-daily z Supabase Vault
-- (lub app.settings w testach), wzorzec identyczny jak get_process_recording_config (F2-06).

-- 1. Funkcja pomocnicza do bezpiecznego odczytu konfiguracji Edge Function build-daily
create or replace function public.get_build_daily_config()
returns table (
  func_url text,
  auth_header text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
begin
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'build_daily_url' limit 1;
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'build_daily_auth' limit 1;
  exception when others then
    v_url := null;
    v_key := null;
  end;

  if v_url is null or v_url = '' then
    v_url := current_setting('app.settings.build_daily_url', true);
  end if;
  if v_key is null or v_key = '' then
    v_key := current_setting('app.settings.build_daily_auth', true);
  end if;

  func_url := v_url;
  auth_header := case when v_key is not null and v_key <> '' then 'Bearer ' || v_key else null end;
  return next;
end;
$$;

-- 2. RPC do żądania natychmiastowej przebudowy wpisu dnia (wywołanie na żądanie z aplikacji,
-- np. użytkownik otwiera dzisiejszy wpis). Zapisuje/aktualizuje wiersz w day_rebuild_queue i od razu
-- wywołuje build-daily przez pg_net, z pominięciem odczekania stosowanego przez pg_cron.
create or replace function public.request_daily_rebuild(p_day date)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cfg record;
  v_headers jsonb;
  v_req_id bigint;
begin
  if v_uid is null then
    raise exception 'request_daily_rebuild wymaga zalogowanego użytkownika';
  end if;

  insert into public.day_rebuild_queue (user_id, day, requested_at)
  values (v_uid, p_day, now())
  on conflict (user_id, day) do update set requested_at = now();

  select * into v_cfg from public.get_build_daily_config();

  if v_cfg.func_url is null or v_cfg.func_url = '' then
    return null;
  end if;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  if v_cfg.auth_header is not null then
    v_headers := v_headers || jsonb_build_object('Authorization', v_cfg.auth_header);
  end if;

  begin
    select net.http_post(
      url := v_cfg.func_url,
      headers := v_headers,
      body := jsonb_build_object('user_id', v_uid, 'day', p_day),
      timeout_milliseconds := 5000
    ) into v_req_id;
  exception when others then
    -- Awaria sieci / pg_net nie może cofnąć zapisu do kolejki; pg_cron i tak ją podejmie
    raise warning 'Błąd wywołania pg_net dla build-daily (user %, day %): %', v_uid, p_day, sqlerrm;
    v_req_id := null;
  end;

  return v_req_id;
end;
$$;

-- 3. Funkcja ponawiania/wywoływania utkniętych wpisów day_rebuild_queue dla zadania pg_cron
create or replace function public.rebuild_due_daily_entries(
  p_older_than interval default interval '10 minutes'
)
returns table (
  user_id uuid,
  day date,
  http_request_id bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg record;
  v_headers jsonb;
  v_entry record;
  v_req_id bigint;
begin
  select * into v_cfg from public.get_build_daily_config();

  if v_cfg.func_url is null or v_cfg.func_url = '' then
    return;
  end if;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  if v_cfg.auth_header is not null then
    v_headers := v_headers || jsonb_build_object('Authorization', v_cfg.auth_header);
  end if;

  for v_entry in
    select q.user_id, q.day
    from public.day_rebuild_queue q
    where q.requested_at < now() - p_older_than
    order by q.requested_at asc
    for update skip locked
  loop
    v_req_id := null;
    begin
      select net.http_post(
        url := v_cfg.func_url,
        headers := v_headers,
        body := jsonb_build_object('user_id', v_entry.user_id, 'day', v_entry.day),
        timeout_milliseconds := 5000
      ) into v_req_id;
    exception when others then
      raise warning 'Błąd pg_net dla build-daily (user %, day %): %', v_entry.user_id, v_entry.day, sqlerrm;
    end;

    user_id := v_entry.user_id;
    day := v_entry.day;
    http_request_id := v_req_id;
    return next;
  end loop;
end;
$$;

-- 4. Harmonogram pg_cron: wywoływanie rebuild_due_daily_entries co 5 minut
do $$
declare
  jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'rebuild-due-daily-entries';
  if jid is not null then
    perform cron.unschedule(jid);
  end if;

  perform cron.schedule(
    'rebuild-due-daily-entries',
    '*/5 * * * *',
    'select public.rebuild_due_daily_entries();'
  );
exception when others then
  raise warning 'Nie udało się zarejestrować zadania w cron.schedule: %', sqlerrm;
end;
$$;

-- 5. Uprawnienia: minimalizacja dostępu
revoke execute on function public.get_build_daily_config() from public, anon, authenticated;
grant execute on function public.get_build_daily_config() to service_role, postgres;

revoke execute on function public.request_daily_rebuild(date) from public, anon;
grant execute on function public.request_daily_rebuild(date) to authenticated, service_role, postgres;

revoke execute on function public.rebuild_due_daily_entries(interval) from public, anon, authenticated;
grant execute on function public.rebuild_due_daily_entries(interval) to service_role, postgres;
