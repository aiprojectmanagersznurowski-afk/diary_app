import { Citation, SearchChunkResult } from './types.ts';

const DOC_CITATION_REGEX = /\[doc:([a-zA-Z0-9_-]+)\]/g;

/**
 * Ekstrahuje identyfikatory dokumentów z tekstu odpowiedzi LLM [doc:<id>],
 * weryfikuje je względem odnalezionych fragmentów i tworzy listę cytatów.
 * Odrzuca identyfikatory zmyślone (halucynacje), które nie występują w chunks.
 */
export function extractCitations(llmText: string, chunks: SearchChunkResult[]): Citation[] {
  const matches = llmText.matchAll(DOC_CITATION_REGEX);
  const seenIds = new Set<string>();
  const citations: Citation[] = [];

  // Mapa document_id -> pierwszy reprezentatywny chunk
  const chunksByDocId = new Map<string, SearchChunkResult>();
  for (const chunk of chunks) {
    if (!chunksByDocId.has(chunk.document_id)) {
      chunksByDocId.set(chunk.document_id, chunk);
    }
  }

  for (const match of matches) {
    const docId = match[1];
    if (seenIds.has(docId)) continue;

    const chunk = chunksByDocId.get(docId);
    if (!chunk) {
      // Odrzuć halucynowane ID nieobecne w wynikach wyszukiwania
      continue;
    }

    seenIds.add(docId);
    citations.push({
      documentId: chunk.document_id,
      title: chunk.title || 'Notatka',
      day: chunk.day,
      kind: chunk.kind,
      noteType: chunk.note_type,
      snippet: chunk.content.slice(0, 200).trim(),
    });
  }

  return citations;
}

/**
 * Formatuje odnalezione fragmenty do sekcji <context> w prompcie generowania odpowiedzi.
 */
export function formatContextFromChunks(chunks: SearchChunkResult[]): string {
  if (chunks.length === 0) {
    return '(Brak powiązanych fragmentów w pamiętniku dla tego zapytania)';
  }

  return chunks
    .map((c) => {
      const title = c.title || 'Bez tytułu';
      const kindInfo = c.note_type || c.kind;
      const header = `[Dokument ${c.document_id}]\nTytuł: ${title} | Data: ${c.day} | Typ: ${kindInfo}`;
      return `${header}\nTreść:\n${c.content}`;
    })
    .join('\n\n---\n\n');
}
