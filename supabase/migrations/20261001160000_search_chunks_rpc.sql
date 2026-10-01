-- Migracja: RPC search_chunks do hybrydowego wyszukiwania (wektor + FTS) z filtrami (F6-01)
-- Zgodnie z docs/02-architektura.md §4, §6.4 oraz wytycznymi kontraktu F6-01.

create index if not exists document_chunks_user_id
  on public.document_chunks (user_id);

create or replace function public.search_chunks(
  query_embedding extensions.vector default null,
  query_text text default null,
  date_from date default null,
  date_to date default null,
  kinds text[] default null,
  category_ids uuid[] default null,
  k int default 10
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  idx int,
  day date,
  kind text,
  note_type text,
  title text,
  slug text,
  category_id uuid,
  category_name text,
  category_color text,
  similarity real
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_query_embedding extensions.vector := query_embedding;
  v_query_text text := trim(coalesce(query_text, ''));
  v_date_from date := date_from;
  v_date_to date := date_to;
  v_kinds text[] := kinds;
  v_category_ids uuid[] := category_ids;
  v_k int := greatest(coalesce(k, 10), 1);
  v_has_vector boolean := (v_query_embedding is not null);
  v_has_text boolean := (v_query_text <> '');
  v_tsquery tsquery;
  v_has_tsquery boolean := false;
begin
  if v_uid is null then
    return;
  end if;

  if v_has_text then
    v_tsquery := pg_catalog.plainto_tsquery('simple', public.immutable_unaccent(v_query_text));
    v_has_tsquery := (v_tsquery is not null and v_tsquery::text <> '');
  end if;

  -- 1. Hybrydowe wyszukiwanie: wektor + FTS łączone metodą Reciprocal Rank Fusion (RRF)
  if v_has_vector and v_has_text then
    return query
    with vec_matches as (
      select
        c.id as chunk_id,
        row_number() over (order by c.embedding operator(extensions.<=>) v_query_embedding asc) as rank_vec
      from public.document_chunks c
      inner join public.documents d on d.id = c.document_id
      where c.user_id = v_uid
        and d.user_id = v_uid
        and c.embedding is not null
        and (v_date_from is null or d.day >= v_date_from)
        and (v_date_to is null or d.day <= v_date_to)
        and (v_kinds is null or array_length(v_kinds, 1) is null or d.kind = any(v_kinds) or d.note_type = any(v_kinds))
        and (v_category_ids is null or array_length(v_category_ids, 1) is null or d.category_id = any(v_category_ids))
      order by c.embedding operator(extensions.<=>) v_query_embedding asc
      limit greatest(v_k * 3, 50)
    ),
    text_matches as (
      select
        c.id as chunk_id,
        row_number() over (
          order by (
            case when v_has_tsquery then pg_catalog.ts_rank_cd(c.fts, v_tsquery) else 0.0 end
            + case when v_has_tsquery and pg_catalog.to_tsvector('simple', public.immutable_unaccent(coalesce(d.title, ''))) @@ v_tsquery then 0.5 else 0.0 end
            + case when c.content ilike ('%' || v_query_text || '%') or d.title ilike ('%' || v_query_text || '%') then 0.2 else 0.0 end
          ) desc
        ) as rank_text
      from public.document_chunks c
      inner join public.documents d on d.id = c.document_id
      where c.user_id = v_uid
        and d.user_id = v_uid
        and (
          (v_has_tsquery and (
            c.fts @@ v_tsquery
            or pg_catalog.to_tsvector('simple', public.immutable_unaccent(coalesce(d.title, ''))) @@ v_tsquery
          ))
          or c.content ilike ('%' || v_query_text || '%')
          or d.title ilike ('%' || v_query_text || '%')
        )
        and (v_date_from is null or d.day >= v_date_from)
        and (v_date_to is null or d.day <= v_date_to)
        and (v_kinds is null or array_length(v_kinds, 1) is null or d.kind = any(v_kinds) or d.note_type = any(v_kinds))
        and (v_category_ids is null or array_length(v_category_ids, 1) is null or d.category_id = any(v_category_ids))
      order by (
        case when v_has_tsquery then pg_catalog.ts_rank_cd(c.fts, v_tsquery) else 0.0 end
        + case when v_has_tsquery and pg_catalog.to_tsvector('simple', public.immutable_unaccent(coalesce(d.title, ''))) @@ v_tsquery then 0.5 else 0.0 end
        + case when c.content ilike ('%' || v_query_text || '%') or d.title ilike ('%' || v_query_text || '%') then 0.2 else 0.0 end
      ) desc
      limit greatest(v_k * 3, 50)
    ),
    rrf as (
      select
        coalesce(v.chunk_id, t.chunk_id) as chunk_id,
        (coalesce(1.0 / (60.0 + v.rank_vec), 0.0) + coalesce(1.0 / (60.0 + t.rank_text), 0.0))::real as rrf_score
      from vec_matches v
      full outer join text_matches t on t.chunk_id = v.chunk_id
    )
    select
      c.id,
      c.document_id,
      c.content,
      c.idx,
      d.day,
      d.kind,
      d.note_type,
      d.title,
      d.slug,
      d.category_id,
      cat.name as category_name,
      cat.color as category_color,
      r.rrf_score as similarity
    from rrf r
    inner join public.document_chunks c on c.id = r.chunk_id
    inner join public.documents d on d.id = c.document_id
    left join public.categories cat on cat.id = d.category_id
    order by r.rrf_score desc, d.day desc, c.idx asc
    limit v_k;

  -- 2. Wyszukiwanie wyłącznie wektorowe
  elsif v_has_vector then
    return query
    select
      c.id,
      c.document_id,
      c.content,
      c.idx,
      d.day,
      d.kind,
      d.note_type,
      d.title,
      d.slug,
      d.category_id,
      cat.name as category_name,
      cat.color as category_color,
      (1.0 - (c.embedding operator(extensions.<=>) v_query_embedding))::real as similarity
    from public.document_chunks c
    inner join public.documents d on d.id = c.document_id
    left join public.categories cat on cat.id = d.category_id
    where c.user_id = v_uid
      and d.user_id = v_uid
      and c.embedding is not null
      and (v_date_from is null or d.day >= v_date_from)
      and (v_date_to is null or d.day <= v_date_to)
      and (v_kinds is null or array_length(v_kinds, 1) is null or d.kind = any(v_kinds) or d.note_type = any(v_kinds))
      and (v_category_ids is null or array_length(v_category_ids, 1) is null or d.category_id = any(v_category_ids))
    order by c.embedding operator(extensions.<=>) v_query_embedding asc, d.day desc, c.idx asc
    limit v_k;

  -- 3. Wyszukiwanie wyłącznie pełnotekstowe
  elsif v_has_text then
    return query
    select
      c.id,
      c.document_id,
      c.content,
      c.idx,
      d.day,
      d.kind,
      d.note_type,
      d.title,
      d.slug,
      d.category_id,
      cat.name as category_name,
      cat.color as category_color,
      (
        case when v_has_tsquery then pg_catalog.ts_rank_cd(c.fts, v_tsquery) else 0.0 end
        + case when v_has_tsquery and pg_catalog.to_tsvector('simple', public.immutable_unaccent(coalesce(d.title, ''))) @@ v_tsquery then 0.5 else 0.0 end
        + case when c.content ilike ('%' || v_query_text || '%') or d.title ilike ('%' || v_query_text || '%') then 0.2 else 0.0 end
      )::real as similarity
    from public.document_chunks c
    inner join public.documents d on d.id = c.document_id
    left join public.categories cat on cat.id = d.category_id
    where c.user_id = v_uid
      and d.user_id = v_uid
      and (
        (v_has_tsquery and (
          c.fts @@ v_tsquery
          or pg_catalog.to_tsvector('simple', public.immutable_unaccent(coalesce(d.title, ''))) @@ v_tsquery
        ))
        or c.content ilike ('%' || v_query_text || '%')
        or d.title ilike ('%' || v_query_text || '%')
      )
      and (v_date_from is null or d.day >= v_date_from)
      and (v_date_to is null or d.day <= v_date_to)
      and (v_kinds is null or array_length(v_kinds, 1) is null or d.kind = any(v_kinds) or d.note_type = any(v_kinds))
      and (v_category_ids is null or array_length(v_category_ids, 1) is null or d.category_id = any(v_category_ids))
    order by similarity desc, d.day desc, c.idx asc
    limit v_k;

  -- 4. Brak zapytania tekstowego i wektorowego: filtrowanie po metadanych
  else
    return query
    select
      c.id,
      c.document_id,
      c.content,
      c.idx,
      d.day,
      d.kind,
      d.note_type,
      d.title,
      d.slug,
      d.category_id,
      cat.name as category_name,
      cat.color as category_color,
      1.0::real as similarity
    from public.document_chunks c
    inner join public.documents d on d.id = c.document_id
    left join public.categories cat on cat.id = d.category_id
    where c.user_id = v_uid
      and d.user_id = v_uid
      and (v_date_from is null or d.day >= v_date_from)
      and (v_date_to is null or d.day <= v_date_to)
      and (v_kinds is null or array_length(v_kinds, 1) is null or d.kind = any(v_kinds) or d.note_type = any(v_kinds))
      and (v_category_ids is null or array_length(v_category_ids, 1) is null or d.category_id = any(v_category_ids))
    order by d.day desc, c.idx asc
    limit v_k;
  end if;
end;
$$;

grant execute on function public.search_chunks to authenticated, service_role;
