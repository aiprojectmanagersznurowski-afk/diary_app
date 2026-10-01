-- Migracja: RPC get_graph i similar_documents z filtrami (F5-01)
-- Zgodnie z docs/02-architektura.md §4, §6.5 oraz wytycznymi kontraktu F5-01.

-- 1. RPC get_graph: zwraca węzły (dokumenty) i krawędzie (linki) dla zalogowanego użytkownika
-- z opcjonalnym filtrowaniem po zakresie dat, kategoriach, typach notatek oraz progu min_score.
create or replace function public.get_graph(
  date_from date default null,
  date_to date default null,
  category_ids uuid[] default null,
  note_types text[] default null,
  min_score real default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_date_from date := date_from;
  v_date_to date := date_to;
  v_category_ids uuid[] := category_ids;
  v_note_types text[] := note_types;
  v_min_score real := min_score;
  v_result jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('nodes', '[]'::jsonb, 'links', '[]'::jsonb);
  end if;

  with filtered_nodes as (
    select
      d.id,
      d.kind,
      d.note_type,
      d.day,
      d.title,
      d.slug,
      d.category_id,
      d.tags,
      d.created_at
    from public.documents d
    where d.user_id = v_uid
      and (v_date_from is null or d.day >= v_date_from)
      and (v_date_to is null or d.day <= v_date_to)
      and (
        v_category_ids is null
        or array_length(v_category_ids, 1) is null
        or d.category_id = any(v_category_ids)
        or d.kind = 'daily'
      )
      and (
        v_note_types is null
        or array_length(v_note_types, 1) is null
        or (d.kind = 'note' and d.note_type = any(v_note_types))
        or d.kind = 'daily'
      )
  ),
  node_ids as (
    select id from filtered_nodes
  ),
  filtered_links as (
    select
      l.source_id,
      l.target_id,
      l.source_id as source,
      l.target_id as target,
      l.kind,
      l.score,
      l.reason
    from public.links l
    where l.user_id = v_uid
      and (v_min_score is null or l.score is null or l.score >= v_min_score)
      and l.source_id in (select id from node_ids)
      and l.target_id in (select id from node_ids)
  )
  select
    jsonb_build_object(
      'nodes', coalesce((select jsonb_agg(to_jsonb(fn) order by fn.day desc, fn.created_at desc) from filtered_nodes fn), '[]'::jsonb),
      'links', coalesce((select jsonb_agg(to_jsonb(fl)) from filtered_links fl), '[]'::jsonb)
    )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_graph to authenticated, service_role;

-- 2. RPC similar_documents: zwraca dokumenty powiązane relacyjnie i semantycznie z podanym document_id.
-- Łączy relacje z tabeli links oraz cosine distance z embeddingów chunków (document_chunks).
create or replace function public.similar_documents(
  document_id uuid,
  k int default 5
)
returns table (
  id uuid,
  kind text,
  note_type text,
  day date,
  title text,
  slug text,
  category_id uuid,
  similarity real,
  relation_type text,
  reason text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_doc_id uuid := document_id;
  v_k int := coalesce(k, 5);
begin
  if v_uid is null then
    return;
  end if;

  return query
  with target_doc as (
    select d.id
    from public.documents d
    where d.id = v_doc_id
      and d.user_id = v_uid
  ),
  -- 1. Bezpośrednie powiązania z tabeli links
  linked_docs as (
    select
      case when l.source_id = v_doc_id then l.target_id else l.source_id end as doc_id,
      coalesce(l.score, 1.0::real) as sim,
      l.kind as rel_type,
      l.reason as rel_reason
    from public.links l
    where l.user_id = v_uid
      and (l.source_id = v_doc_id or l.target_id = v_doc_id)
      and exists (select 1 from target_doc)
  ),
  -- 2. Podobieństwo semantyczne z wektorów chunków
  semantic_docs as (
    select
      c2.document_id as doc_id,
      (1.0 - (c1.embedding operator(extensions.<=>) c2.embedding))::real as sim,
      'semantic'::text as rel_type,
      'Wektorowe podobieństwo treści'::text as rel_reason
    from public.document_chunks c1
    cross join lateral (
      select c.document_id, c.embedding
      from public.document_chunks c
      where c.user_id = v_uid
        and c.document_id <> v_doc_id
        and c.embedding is not null
      order by c1.embedding operator(extensions.<=>) c.embedding
      limit v_k
    ) c2
    where c1.document_id = v_doc_id
      and c1.user_id = v_uid
      and c1.embedding is not null
      and exists (select 1 from target_doc)
  ),
  -- 3. Połączenie i deduplikacja (wybór najwyższego similarity per dokument)
  combined as (
    select doc_id, sim, rel_type, rel_reason from linked_docs
    union all
    select doc_id, sim, rel_type, rel_reason from semantic_docs
  ),
  ranked as (
    select
      c.doc_id,
      c.sim,
      c.rel_type,
      c.rel_reason,
      row_number() over (partition by c.doc_id order by c.sim desc) as rn
    from combined c
  )
  select
    d.id,
    d.kind,
    d.note_type,
    d.day,
    d.title,
    d.slug,
    d.category_id,
    r.sim as similarity,
    r.rel_type as relation_type,
    r.rel_reason as reason
  from ranked r
  inner join public.documents d on d.id = r.doc_id
  where r.rn = 1
    and d.user_id = v_uid
    and d.id <> v_doc_id
  order by r.sim desc
  limit v_k;
end;
$$;

grant execute on function public.similar_documents to authenticated, service_role;
