-- Pomocnicze funkcje do testów RLS, używane przez wszystkie pozostałe pliki w tym katalogu
-- (uruchamiane w kolejności alfabetycznej, stąd prefiks "000" — muszą wykonać się pierwsze).
--
-- Świadomie NIE używamy oficjalnego pakietu `basejump-supabase_test_helpers` z database.dev:
-- jego instalacja wymaga pobrania kodu przez sieć (rozszerzenia http + pg_tle + dbdev) przy
-- KAŻDYM `supabase db reset`/`supabase test db`, także w CI. To krucha zależność dla czegoś tak
-- prostego jak "utwórz dwóch użytkowników testowych i przełącz się między nimi". Poniżej własna,
-- w pełni lokalna implementacja tego samego, publicznie znanego interfejsu
-- (tests.create_supabase_user / tests.authenticate_as / tests.get_supabase_uid), żeby pliki
-- testów RLS wyglądały tak, jak wygląda to w oficjalnej dokumentacji Supabase.
--
-- Definicje funkcji celowo NIE są w bloku begin/rollback — mają przetrwać do końca przebiegu
-- testów, żeby kolejne pliki (alfabetycznie później) mogły z nich korzystać.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists tests;

create or replace function tests.create_supabase_user(email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    email, extensions.crypt('test-password', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}'
  );
  return new_id;
end;
$$;

create or replace function tests.get_supabase_uid(user_email text)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select id from auth.users where auth.users.email = user_email;
$$;

-- Postgres zabrania "set local role" wewnątrz funkcji SECURITY DEFINER ("cannot set parameter
-- 'role' within security-definer function") — stąd rozbicie na dwie funkcje: odczyt auth.users
-- (wymaga SECURITY DEFINER, bo `authenticated` nie ma do niego dostępu) i samo przełączenie roli
-- (musi wykonać się jako zwykła funkcja, bez podniesionych uprawnień).
create or replace function tests.authenticate_as(user_email text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := tests.get_supabase_uid(user_email);
begin
  if uid is null then
    raise exception 'test user % not found; call tests.create_supabase_user first', user_email;
  end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

-- Rola `authenticated` musi móc wywołać te funkcje ponownie (np. żeby przełączyć się z powrotem
-- na innego użytkownika testowego w tej samej transakcji) mimo braku domyślnego dostępu do
-- schematu `tests`. SECURITY DEFINER załatwia same operacje wewnątrz (insert do auth.users itd.),
-- ale wywołujący i tak potrzebuje EXECUTE na samą funkcję.
grant usage on schema tests to authenticated, anon, service_role;
grant execute on all functions in schema tests to authenticated, anon, service_role;
alter default privileges in schema tests
  grant execute on functions to authenticated, anon, service_role;

-- Sanity check samych helperów.
begin;
  select plan(3);

  select ok(
    tests.create_supabase_user('helper-check-a@test.local') is not null,
    'create_supabase_user zwraca id'
  );
  select is(
    tests.get_supabase_uid('helper-check-a@test.local'),
    (select id from auth.users where email = 'helper-check-a@test.local'),
    'get_supabase_uid znajduje utworzonego użytkownika'
  );
  select lives_ok(
    $$select tests.authenticate_as('helper-check-a@test.local')$$,
    'authenticate_as nie rzuca wyjątku dla istniejącego użytkownika'
  );

  select * from finish();
rollback;

do $$ begin raise notice 'MARKER_DONE_000_test_helpers'; end $$;
