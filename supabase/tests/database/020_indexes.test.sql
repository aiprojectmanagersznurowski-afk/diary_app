-- Indeksy wymagane przez docs/02-architektura.md §4.

begin;
  select plan(4);

  do $$
  declare r record;
  begin
    for r in select tablename, indexname from pg_indexes where schemaname = 'public' and tablename in ('documents', 'document_chunks') order by 1, 2 loop
      raise notice 'DEBUG index: %.%', r.tablename, r.indexname;
    end loop;
  end $$;

  select has_index(
    'public', 'document_chunks', 'document_chunks_embedding_hnsw',
    'HNSW na document_chunks.embedding istnieje'
  );
  select has_index(
    'public', 'document_chunks', 'document_chunks_fts',
    'GIN na document_chunks.fts istnieje'
  );
  select has_index(
    'public', 'documents', 'documents_user_day',
    'btree (user_id, day) na documents istnieje'
  );
  select has_index(
    'public', 'documents', 'documents_user_kind',
    'btree (user_id, kind) na documents istnieje'
  );

  do $$ begin raise notice 'DEBUG 020_indexes reached finish()'; end $$;
  select * from finish();
rollback;

