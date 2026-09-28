-- Migracja: Webhook bazy i ponawianie przez pg_cron (F2-06)
-- Zgodnie z docs/02-architektura.md §6.1, §9 oraz wytycznymi F2-06.
-- Brak wpisanych sekretów: URL i klucz pobierane z Supabase Vault (lub app.settings w testach).

-- 1. Upewniamy się, że rozszerzenie vault jest włączone. Niedostępne na części obrazów Postgresa
-- używanych lokalnie/w CI (brak pliku kontrolnego rozszerzenia) — reszta tej migracji już zakłada
-- taki brak i ma fallback do app.settings (patrz get_process_recording_config niżej), więc błąd
-- tutaj jest tylko ostrzeżeniem, nie przerywa migracji.
do $$
begin
  create extension if not exists vault with schema vault;
exception when others then
  raise warning 'Rozszerzenie vault niedostępne w tym środowisku, używam fallbacku app.settings: %', sqlerrm;
end $$;

-- 2. Funkcja pomocnicza do bezpiecznego odczytu konfiguracji Edge Function
create or replace function public.get_process_recording_config()
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
  -- Próba odczytu z vault.decrypted_secrets
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'process_recording_url' limit 1;
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'process_recording_auth' limit 1;
  exception when others then
    v_url := null;
    v_key := null;
  end;

  -- Fallback do app.settings (dla środowiska testowego pgTAP / lokalnego bez Vaulta)
  if v_url is null or v_url = '' then
    v_url := current_setting('app.settings.process_recording_url', true);
  end if;
  if v_key is null or v_key = '' then
    v_key := current_setting('app.settings.process_recording_auth', true);
  end if;

  func_url := v_url;
  auth_header := case when v_key is not null and v_key <> '' then 'Bearer ' || v_key else null end;
  return next;
end;
$$;

-- 3. Trigger AFTER INSERT na recordings: wywołanie Edge Function process-recording przez pg_net
create or replace function public.trigger_process_recording_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg record;
  v_headers jsonb;
  v_payload jsonb;
  v_req_id bigint;
begin
  -- Uruchamiamy tylko dla nowo utworzonych nagrań oczekujących na transkrypcję
  if new.status <> 'uploaded' then
    return new;
  end if;

  select * into v_cfg from public.get_process_recording_config();

  -- Jeśli URL nie jest skonfigurowany (np. przed CP-SECRETS), nie blokujemy INSERTa klienta
  if v_cfg.func_url is null or v_cfg.func_url = '' then
    return new;
  end if;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  if v_cfg.auth_header is not null then
    v_headers := v_headers || jsonb_build_object('Authorization', v_cfg.auth_header);
  end if;

  v_payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'recordings',
    'record', jsonb_build_object(
      'id', new.id,
      'user_id', new.user_id,
      'recorded_at', new.recorded_at,
      'audio_path', new.audio_path,
      'source', new.source,
      'status', new.status
    )
  );

  begin
    select net.http_post(
      url := v_cfg.func_url,
      headers := v_headers,
      body := v_payload,
      timeout_milliseconds := 5000
    ) into v_req_id;
  exception when others then
    -- Awaria sieci / pg_net nie może cofnąć transakcji zapisu nagrania użytkownika
    raise warning 'Błąd wywołania pg_net dla nagrania %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists trg_process_recording_on_insert on public.recordings;
create trigger trg_process_recording_on_insert
  after insert on public.recordings
  for each row
  execute function public.trigger_process_recording_on_insert();

-- 4. Funkcja ponawiania utkniętych nagrań dla zadania pg_cron
create or replace function public.retry_stuck_recordings(
  p_older_than interval default interval '5 minutes',
  p_max_attempts int default 3
)
returns table (
  recording_id uuid,
  attempts int,
  http_request_id bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg record;
  v_headers jsonb;
  v_rec record;
  v_req_id bigint;
begin
  select * into v_cfg from public.get_process_recording_config();

  -- Brak skonfigurowanego URL uniemożliwia wysłanie żądań HTTP
  if v_cfg.func_url is null or v_cfg.func_url = '' then
    return;
  end if;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  if v_cfg.auth_header is not null then
    v_headers := v_headers || jsonb_build_object('Authorization', v_cfg.auth_header);
  end if;

  for v_rec in
    select r.id, r.user_id, r.recorded_at, r.audio_path, r.source, r.status, r.attempts
    from public.recordings r
    where r.status not in ('done', 'failed')
      and r.created_at < now() - p_older_than
      and r.attempts < p_max_attempts
    order by r.created_at asc
    for update skip locked
  loop
    v_req_id := null;
    begin
      select net.http_post(
        url := v_cfg.func_url,
        headers := v_headers,
        body := jsonb_build_object(
          'type', 'RETRY',
          'table', 'recordings',
          'recording_id', v_rec.id,
          'record', jsonb_build_object(
            'id', v_rec.id,
            'user_id', v_rec.user_id,
            'recorded_at', v_rec.recorded_at,
            'audio_path', v_rec.audio_path,
            'source', v_rec.source,
            'status', v_rec.status
          )
        ),
        timeout_milliseconds := 5000
      ) into v_req_id;
    exception when others then
      raise warning 'Błąd retry pg_net dla nagrania %: %', v_rec.id, sqlerrm;
    end;

    update public.recordings
    set attempts = v_rec.attempts + 1
    where id = v_rec.id;

    recording_id := v_rec.id;
    attempts := v_rec.attempts + 1;
    http_request_id := v_req_id;
    return next;
  end loop;
end;
$$;

-- 5. Harmonogram pg_cron: uruchamianie retry_stuck_recordings co 5 minut
do $$
declare
  jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'retry-stuck-recordings';
  if jid is not null then
    perform cron.unschedule(jid);
  end if;

  perform cron.schedule(
    'retry-stuck-recordings',
    '*/5 * * * *',
    'select public.retry_stuck_recordings();'
  );
exception when others then
  raise warning 'Nie udało się zarejestrować zadania w cron.schedule: %', sqlerrm;
end;
$$;

-- 6. Uprawnienia: minimalizacja dostępu
revoke execute on function public.get_process_recording_config() from public, anon, authenticated;
grant execute on function public.get_process_recording_config() to service_role, postgres;

revoke execute on function public.trigger_process_recording_on_insert() from public, anon;
grant execute on function public.trigger_process_recording_on_insert() to authenticated, service_role, postgres;

revoke execute on function public.retry_stuck_recordings(interval, int) from public, anon, authenticated;
grant execute on function public.retry_stuck_recordings(interval, int) to service_role, postgres;
