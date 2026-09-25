-- Indeksy wymagane przez docs/02-architektura.md §4.

begin;
  select plan(4);

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

