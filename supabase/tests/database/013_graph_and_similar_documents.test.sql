-- Testy pgTAP dla get_graph i similar_documents (F5-01)
-- Weryfikacja: RLS/izolacja między użytkownikami, filtry dat/kategorii/typów/min_score, powiązania w similar_documents.

begin;
  select plan(12);

  -- 1. Tworzenie użytkowników testowych
  select tests.create_supabase_user('user-graph-a@test.local');
  select tests.create_supabase_user('user-graph-b@test.local');

  -- 2. Przygotowanie danych użytkownika A
  select tests.authenticate_as('user-graph-a@test.local');

  insert into public.categories (id, user_id, name, color) values
    ('a0000000-0000-0000-0000-000000000001', tests.get_supabase_uid('user-graph-a@test.local'), 'Praca', '#3B82F6'),
    ('a0000000-0000-0000-0000-000000000002', tests.get_supabase_uid('user-graph-a@test.local'), 'Zdrowie', '#10B981');

  insert into public.documents (id, user_id, kind, note_type, day, title, slug, category_id, tags) values
    ('d0000000-0000-0000-0000-000000000001', tests.get_supabase_uid('user-graph-a@test.local'), 'daily', null, '2026-09-20', 'Wpis 20 wrz', '2026-09-20', null, '{daily}'),
    ('d0000000-0000-0000-0000-000000000002', tests.get_supabase_uid('user-graph-a@test.local'), 'note', 'idea', '2026-09-20', 'Pomysł A', 'pomysl-a', 'a0000000-0000-0000-0000-000000000001', '{startup}'),
    ('d0000000-0000-0000-0000-000000000003', tests.get_supabase_uid('user-graph-a@test.local'), 'note', 'task', '2026-09-22', 'Zadanie A', 'zadanie-a', 'a0000000-0000-0000-0000-000000000002', '{sport}'),
    ('d0000000-0000-0000-0000-000000000004', tests.get_supabase_uid('user-graph-a@test.local'), 'note', 'reflection', '2026-09-25', 'Refleksja A', 'refleksja-a', null, '{mysli}');

  insert into public.links (user_id, source_id, target_id, kind, score, reason) values
    (tests.get_supabase_uid('user-graph-a@test.local'), 'd0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'day', null, 'Notatka z dnia'),
    (tests.get_supabase_uid('user-graph-a@test.local'), 'd0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'semantic', 0.85, 'Podobne tematycznie'),
    (tests.get_supabase_uid('user-graph-a@test.local'), 'd0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 'semantic', 0.40, 'Luźne skojarzenie');

  -- Chunki z wektorami dla Pomysłu A i Zadania A (identyczne wektory -> odległość 0, podobieństwo 1.0)
  insert into public.document_chunks (id, document_id, user_id, idx, content, embedding) values
    ('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', tests.get_supabase_uid('user-graph-a@test.local'), 0, 'Treść pomysłu', array_fill(0.1::real, array[1536])::extensions.vector),
    ('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', tests.get_supabase_uid('user-graph-a@test.local'), 0, 'Treść zadania', array_fill(0.1::real, array[1536])::extensions.vector);

  -- 3. Przygotowanie danych użytkownika B (w celu testu izolacji)
  select tests.authenticate_as('user-graph-b@test.local');

  insert into public.documents (id, user_id, kind, note_type, day, title, slug) values
    ('b0000000-0000-0000-0000-000000000001', tests.get_supabase_uid('user-graph-b@test.local'), 'daily', null, '2026-09-20', 'Wpis B', '2026-09-20-b'),
    ('b0000000-0000-0000-0000-000000000002', tests.get_supabase_uid('user-graph-b@test.local'), 'note', 'idea', '2026-09-20', 'Pomysł B', 'pomysl-b');

  insert into public.links (user_id, source_id, target_id, kind) values
    (tests.get_supabase_uid('user-graph-b@test.local'), 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'day');

  insert into public.document_chunks (id, document_id, user_id, idx, content, embedding) values
    ('cb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', tests.get_supabase_uid('user-graph-b@test.local'), 0, 'Treść B', array_fill(0.1::real, array[1536])::extensions.vector);

  -- 4. Testy dla użytkownika A
  select tests.authenticate_as('user-graph-a@test.local');

  -- Test 1: get_graph() zwraca 4 węzły dla A
  select results_eq(
    'select jsonb_array_length(public.get_graph()->''nodes'')',
    array[4],
    'get_graph: użytkownik A widzi 4 węzły'
  );

  -- Test 2: get_graph() zwraca 3 krawędzie dla A
  select results_eq(
    'select jsonb_array_length(public.get_graph()->''links'')',
    array[3],
    'get_graph: użytkownik A widzi 3 krawędzie'
  );

  -- Test 3: filtr date_from zawęża węzły i krawędzie
  select results_eq(
    'select jsonb_array_length(public.get_graph(date_from := ''2026-09-22''::date)->''nodes'')',
    array[2],
    'get_graph: filtr date_from zawęża do 2 węzłów (dla dni >= 2026-09-22)'
  );

  -- Test 4: krawędzie są odrzucane jeśli którykolwiek z połączonych węzłów odpadł w filtrze
  select results_eq(
    'select jsonb_array_length(public.get_graph(date_from := ''2026-09-22''::date)->''links'')',
    array[1],
    'get_graph: krawędź do odfiltrowanego węzła d2 nie jest zwracana'
  );

  -- Test 5: filtr category_ids wybiera dokumenty z danej kategorii + wpisy dnia
  select results_eq(
    'select jsonb_array_length(public.get_graph(category_ids := array[''a0000000-0000-0000-0000-000000000001''::uuid])->''nodes'')',
    array[2],
    'get_graph: filtr category_ids zwraca notatkę z danej kategorii + wpis dnia'
  );

  -- Test 6: filtr note_types wybiera wskazane typy notatek + wpisy dnia
  select results_eq(
    'select jsonb_array_length(public.get_graph(note_types := array[''idea''])->''nodes'')',
    array[2],
    'get_graph: filtr note_types zwraca notatki typu idea + wpis dnia'
  );

  -- Test 7: filtr min_score odrzuca powiązania słabsze niż próg, ale zachowuje linki strukturalne (score is null)
  select results_eq(
    'select jsonb_array_length(public.get_graph(min_score := 0.70::real)->''links'')',
    array[2],
    'get_graph: min_score odrzuca link o score 0.40, zachowując link 0.85 oraz day (score is null)'
  );

  -- Test 8: similar_documents zwraca powiązane dokumenty dla Pomysłu A (d2)
  select results_eq(
    'select count(*)::bigint from public.similar_documents(''d0000000-0000-0000-0000-000000000002''::uuid, 5)',
    array[2::bigint],
    'similar_documents: zwraca 2 powiązane dokumenty dla Pomysłu A (d1 przez links, d3 przez links i wektory)'
  );

  -- Test 9: similar_documents zwraca najwyższy score dla d3
  select results_eq(
    'select relation_type from public.similar_documents(''d0000000-0000-0000-0000-000000000002''::uuid, 5) where id = ''d0000000-0000-0000-0000-000000000003''::uuid',
    array['semantic'::text],
    'similar_documents: typ relacji dla d3 to semantic'
  );

  -- 5. Testy izolacji (użytkownik B)
  select tests.authenticate_as('user-graph-b@test.local');

  -- Test 10: get_graph dla użytkownika B zwraca tylko jego własne dane (2 węzły, 1 link)
  select results_eq(
    'select jsonb_array_length(public.get_graph()->''nodes'')',
    array[2],
    'izolacja: użytkownik B widzi tylko 2 własne węzły'
  );
  select results_eq(
    'select jsonb_array_length(public.get_graph()->''links'')',
    array[1],
    'izolacja: użytkownik B widzi tylko 1 własną krawędź'
  );

  -- Test 11: similar_documents wywołane przez B dla dokumentu należącego do A zwraca 0 wyników
  select is_empty(
    'select 1 from public.similar_documents(''d0000000-0000-0000-0000-000000000002''::uuid, 5)',
    'izolacja: użytkownik B nie otrzymuje żadnych powiązań dla dokumentu użytkownika A'
  );

rollback;
