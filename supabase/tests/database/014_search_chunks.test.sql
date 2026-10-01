-- Testy pgTAP dla RPC search_chunks (F6-01)
-- Weryfikacja: RLS/izolacja między użytkownikami, wyszukiwanie wektorowe, pełnotekstowe i hybrydowe (RRF),
-- filtry dat, rodzajów dokumentów (kind/note_type), kategorii oraz limit k.

begin;
  select plan(14);

  -- 1. Tworzenie użytkowników testowych
  select tests.create_supabase_user('user-search-a@test.local');
  select tests.create_supabase_user('user-search-b@test.local');

  -- 2. Przygotowanie danych użytkownika A
  select tests.authenticate_as('user-search-a@test.local');

  insert into public.categories (id, user_id, name, color) values
    ('a0000000-0000-0000-0000-000000000001', tests.get_supabase_uid('user-search-a@test.local'), 'Praca', '#3B82F6'),
    ('a0000000-0000-0000-0000-000000000002', tests.get_supabase_uid('user-search-a@test.local'), 'Zdrowie', '#10B981');

  insert into public.documents (id, user_id, kind, note_type, day, title, slug, category_id, tags) values
    ('d0000000-0000-0000-0000-000000000001', tests.get_supabase_uid('user-search-a@test.local'), 'daily', null, '2026-09-20', 'Wpis 20 wrz', '2026-09-20', null, '{daily}'),
    ('d0000000-0000-0000-0000-000000000002', tests.get_supabase_uid('user-search-a@test.local'), 'note', 'idea', '2026-09-20', 'Pomysł na startup AI', 'pomysl-startup-ai', 'a0000000-0000-0000-0000-000000000001', '{startup,ai}'),
    ('d0000000-0000-0000-0000-000000000003', tests.get_supabase_uid('user-search-a@test.local'), 'note', 'task', '2026-09-22', 'Trening biegowy', 'trening-biegowy', 'a0000000-0000-0000-0000-000000000002', '{sport}'),
    ('d0000000-0000-0000-0000-000000000004', tests.get_supabase_uid('user-search-a@test.local'), 'note', 'reflection', '2026-09-25', 'Refleksja o modelach AI', 'refleksja-ai', null, '{mysli}');

  -- Wektory ortogonalne: [1.0, 0, ...] dla sportu/wpisu dnia, [0, 1.0, ...] dla AI/startupu
  insert into public.document_chunks (id, document_id, user_id, idx, content, embedding) values
    ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', tests.get_supabase_uid('user-search-a@test.local'), 0, 'Dzień pełen pracy i wieczorny jogging w parku.', (array[1.0::real] || array_fill(0.0::real, array[1535]))::extensions.vector),
    ('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', tests.get_supabase_uid('user-search-a@test.local'), 0, 'Innowacyjny startup technologiczny, w którym sztuczna inteligencja wspiera pisanie.', (array[0.0::real, 1.0::real] || array_fill(0.0::real, array[1534]))::extensions.vector),
    ('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', tests.get_supabase_uid('user-search-a@test.local'), 0, 'Zadanie sportowe: przygotowanie do maratonu i bieganie.', (array[1.0::real] || array_fill(0.0::real, array[1535]))::extensions.vector),
    ('c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', tests.get_supabase_uid('user-search-a@test.local'), 0, 'Rozważania o przyszłości: sztuczna inteligencja w edukacji i nauce.', (array[0.0::real, 0.8::real, 0.2::real] || array_fill(0.0::real, array[1533]))::extensions.vector);

  -- 3. Przygotowanie danych użytkownika B (w celu weryfikacji izolacji)
  select tests.authenticate_as('user-search-b@test.local');

  insert into public.documents (id, user_id, kind, note_type, day, title, slug) values
    ('b0000000-0000-0000-0000-000000000001', tests.get_supabase_uid('user-search-b@test.local'), 'note', 'idea', '2026-09-20', 'Sekretny pomysł B o sztucznej inteligencji', 'pomysl-b-ai');

  insert into public.document_chunks (id, document_id, user_id, idx, content, embedding) values
    ('cb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', tests.get_supabase_uid('user-search-b@test.local'), 0, 'Tajne notatki: sztuczna inteligencja użytkownika B.', (array[0.0::real, 1.0::real] || array_fill(0.0::real, array[1534]))::extensions.vector);

  -- 4. Testy dla użytkownika A
  select tests.authenticate_as('user-search-a@test.local');

  -- Test 1: Wyszukiwanie wyłącznie tekstowe zwraca dopasowane chunki użytkownika A
  select results_eq(
    $$select count(*)::bigint from public.search_chunks(query_text := 'sztuczna inteligencja')$$,
    array[2::bigint],
    'search_chunks (text): zwraca 2 pasujące chunki użytkownika A dla hasła sztuczna inteligencja'
  );

  -- Test 2: Wyszukiwanie wektorowe zwraca najbardziej zbliżony chunk
  select results_eq(
    $$select id from public.search_chunks(query_embedding := (array[0.0::real, 1.0::real] || array_fill(0.0::real, array[1534]))::extensions.vector, k := 1)$$,
    array['c0000000-0000-0000-0000-000000000002'::uuid],
    'search_chunks (vector): chunk c...2 jest pierwszy na liście podobieństwa wektorowego'
  );

  -- Test 3: Wyszukiwanie hybrydowe (RRF) łączy dopasowanie wektorowe i tekstowe
  select results_eq(
    $$select id from public.search_chunks(
        query_embedding := (array[0.0::real, 1.0::real] || array_fill(0.0::real, array[1534]))::extensions.vector,
        query_text := 'startup sztuczna inteligencja',
        k := 1
      )$$,
    array['c0000000-0000-0000-0000-000000000002'::uuid],
    'search_chunks (hybrid RRF): chunk łączący trafienie wektorowe i tekstowe uzyskuje 1. miejsce'
  );

  -- Test 4: Izolacja użytkowników: użytkownik B widzi wyłącznie swoje dane
  select tests.authenticate_as('user-search-b@test.local');
  select results_eq(
    $$select count(*)::bigint from public.search_chunks(query_text := 'sztuczna inteligencja')$$,
    array[1::bigint],
    'izolacja: użytkownik B widzi tylko 1 własny chunk przy identycznym zapytaniu'
  );
  select results_eq(
    $$select id from public.search_chunks(query_text := 'sztuczna inteligencja')$$,
    array['cb000000-0000-0000-0000-000000000001'::uuid],
    'izolacja: użytkownik B otrzymuje wyłącznie swój chunk cb...1'
  );

  -- Powrót do użytkownika A
  select tests.authenticate_as('user-search-a@test.local');

  -- Test 6: Filtr date_from ogranicza wyniki do późniejszych dni
  select results_eq(
    $$select count(*)::bigint from public.search_chunks(date_from := '2026-09-22'::date)$$,
    array[2::bigint],
    'filtry: date_from := 2026-09-22 zwraca 2 chunki (z 22 i 25 września)'
  );

  -- Test 7: Filtr date_to ogranicza wyniki do wcześniejszych dni
  select results_eq(
    $$select count(*)::bigint from public.search_chunks(date_to := '2026-09-21'::date)$$,
    array[2::bigint],
    'filtry: date_to := 2026-09-21 zwraca 2 chunki (z 20 września)'
  );

  -- Test 8: Filtr kinds (note_type 'idea')
  select results_eq(
    $$select count(*)::bigint from public.search_chunks(kinds := array['idea'])$$,
    array[1::bigint],
    'filtry: kinds := array[idea] zwraca notatkę z note_type = idea'
  );

  -- Test 9: Filtr kinds (kind 'daily')
  select results_eq(
    $$select count(*)::bigint from public.search_chunks(kinds := array['daily'])$$,
    array[1::bigint],
    'filtry: kinds := array[daily] zwraca wyłącznie wpisy dnia'
  );

  -- Test 10: Filtr category_ids
  select results_eq(
    $$select count(*)::bigint from public.search_chunks(category_ids := array['a0000000-0000-0000-0000-000000000001'::uuid])$$,
    array[1::bigint],
    'filtry: category_ids zwraca dokument przypisany do kategorii Praca'
  );

  -- Test 11: Parametr k ogranicza liczbę zwracanych wyników
  select results_eq(
    $$select count(*)::bigint from public.search_chunks(k := 1)$$,
    array[1::bigint],
    'limit k: parametr k := 1 zwraca dokładnie 1 wiersz'
  );

  -- Test 12: Weryfikacja metadanych w wyniku (kategoria, kolor, tytuł)
  select results_eq(
    $$select category_name || ':' || category_color || ':' || title from public.search_chunks(
        category_ids := array['a0000000-0000-0000-0000-000000000001'::uuid],
        k := 1
      )$$,
    array['Praca:#3B82F6:Pomysł na startup AI'::text],
    'metadane: search_chunks zwraca nazwę i kolor kategorii oraz tytuł dokumentu'
  );

  -- Test 13: Dopasowanie tekstowe po tytule dokumentu
  select results_eq(
    $$select id from public.search_chunks(query_text := 'startup', k := 1)$$,
    array['c0000000-0000-0000-0000-000000000002'::uuid],
    'search_chunks (title match): wyszukiwanie po słowie z tytułu dopasowuje właściwy chunk'
  );

  -- Test 14: Wywołanie bez autentykacji (rola anon, brak sub w jwt claims) zwraca 0 wyników
  select set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;

  select is_empty(
    $$select * from public.search_chunks()$$,
    'search_chunks bez autentykacji zwraca pusty zbiór'
  );

  select * from finish();
rollback;
