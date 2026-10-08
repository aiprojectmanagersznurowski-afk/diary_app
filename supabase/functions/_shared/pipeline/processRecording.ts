import { IDatabaseClient, IStorageClient, DocumentInsert, DocumentChunkInsert, LinkInsert } from '../db/types.ts';
import { AiProviders } from '../ai/factory.ts';
import { structureSchema, StructuredNote } from '../schemas/structure.ts';
import { linkSchema, LinkItem } from '../schemas/link.ts';
import { validateAndRepairJson } from '../ai/validate.ts';
import { renderNoteMarkdown, generateNoteSlug } from '../markdown/noteTemplate.ts';

export interface PipelineOptions {
  recordingId: string;
  db: IDatabaseClient;
  storage: IStorageClient;
  aiProviders: AiProviders;
  structurePromptTemplate?: string;
  linkPromptTemplate?: string;
}

export interface PipelineResult {
  recordingId: string;
  status: 'done' | 'failed';
  documentIds: string[];
}

const DEFAULT_STRUCTURE_PROMPT = `Jesteś asystentem AI odpowiedzialnym za podział surowej transkrypcji głosowej na atomowe, spójne notatki w pamiętniku osobistym.
Podziel poniższą wypowiedź na 1 lub więcej odrębnych, atomowych notatek. Każda notatka powinna dotyczyć jednego wątku.
Dozwolone typy notatek (noteType):
- "idea": Nowy pomysł, koncepcja, projekt do zrealizowania.
- "task": Zadanie do wykonania, czynność, plan działania, 'to-do'.
- "reflection": Osobista refleksja, przemyślenie, emocja, stan ducha.
- "event": Wydarzenie z życia, spotkanie, fakt, relacja z dnia.

Kategorie (category) – dokładnie jedna z: "Praca", "Zdrowie", "Relacje", "Finanse", "Osobiste", "Hobby", "Nauka", "Dylematy".
"Dylematy" stosuj WYŁĄCZNIE, gdy decyzja nie jest jeszcze podjęta i użytkownik rozważa co najmniej dwie opcje lub wyraża wahanie. Decyzje już podjęte, zadania, emocje i pomysły bez rozterki przypisz do kategorii tematycznej. W dylemacie zachowaj wszystkie opcje, argumenty i obawy.

Odpowiedź MUSI być poprawnym obiektem JSON w formacie:
{
  "notes": [
    {
      "title": "Zwięzły tytuł notatki (2-6 słów)",
      "noteType": "event",
      "category": "Praca",
      "tags": ["tag1", "tag2"],
      "content": "Zredagowany tekst notatki w 1. osobie..."
    }
  ]
}

<transcript>
{{TRANSCRIPT}}
</transcript>`;

const DEFAULT_LINK_PROMPT = `Jesteś asystentem AI oceniającym powiązania między notatkami.
Oceń powiązania między notatką źródłową a podanymi kandydatami.
Wolno Ci wybrać WYŁĄCZNIE identyfikatory z listy kandydatów.
Odpowiedź zwróć w formacie JSON zgodnym ze schematem link:
{
  "links": [
    {
      "targetId": "uuid-kandydata",
      "score": 0.85,
      "reason": "Krótkie uzasadnienie powiązania"
    }
  ]
}
<source_note>
{{SOURCE_NOTE}}
</source_note>
<candidates>
{{CANDIDATES}}
</candidates>`;

let structurePromptCache: string | null = null;

async function loadStructurePromptTemplate(): Promise<string> {
  if (structurePromptCache) return structurePromptCache;
  try {
    const path = new URL('../prompts/structure.v3.md', import.meta.url);
    const raw = await Deno.readTextFile(path);
    const match = raw.match(/^---[\s\S]*?---\n?([\s\S]*)$/);
    const content = (match ? match[1] : raw).trim();
    structurePromptCache = content;
    return content;
  } catch {
    return DEFAULT_STRUCTURE_PROMPT;
  }
}

/**
 * Główny przepływ przetwarzania nagrania (kroki a-e z docs/02-architektura.md §6.1).
 * Każdy krok sprawdza status i jest w pełni idempotentny.
 */
export async function processRecordingPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const { recordingId, db, storage, aiProviders } = options;

  const recording = await db.getRecording(recordingId);
  if (!recording) {
    throw new Error(`Nagranie ${recordingId} nie zostało odnalezione`);
  }

  // Idempotencja: jeśli nagranie jest już zakończone sukcesem, natychmiast zwróć dokumenty
  if (recording.status === 'done') {
    const existingDocs = await db.getDocumentsByRecordingId(recordingId);
    return {
      recordingId,
      status: 'done',
      documentIds: existingDocs.map((d) => d.id),
    };
  }

  try {
    let currentStatus = recording.status;
    let transcript = recording.raw_transcript;

    // --- KROK A: Transkrypcja STT (status 'uploaded' -> 'transcribed') ---
    if (!transcript) {
      const audioPath = recording.audio_path || `${recording.user_id}/${recording.id}.m4a`;
      const audioData = await storage.downloadAudio(audioPath);
      transcript = await aiProviders.stt.transcribe(audioData, { language: 'pl' });

      // Zapisujemy raw_transcript - reguła: raw_transcript nigdy nie jest nadpisywany po zapisaniu
      await db.updateRecording(recordingId, {
        raw_transcript: transcript,
        status: 'transcribed',
      });
      currentStatus = 'transcribed';
    }

    // --- KROK B: Podział na notatki LLM (status 'transcribed' -> 'segmented') ---
    let documents = await db.getDocumentsByRecordingId(recordingId);

    if (currentStatus === 'uploaded' || currentStatus === 'transcribed' || documents.length === 0) {
      const promptTemplate =
        options.structurePromptTemplate || (await loadStructurePromptTemplate()) || DEFAULT_STRUCTURE_PROMPT;
      const filledPrompt = promptTemplate.replace('{{TRANSCRIPT}}', transcript || '');

      const structureResponseText = await aiProviders.structure.generateText(
        [{ role: 'user', content: filledPrompt }],
        { responseFormat: 'json', temperature: 0.2 },
      );

      const repairCallback = async (errMsg: string, rawText: string) => {
        const repairPrompt = `Popraw poniższą odpowiedź, aby była poprawnym obiektem JSON zawierającym pole "notes" (tablicę notatek):
{
  "notes": [
    {
      "title": "Krótki tytuł",
      "noteType": "idea" | "task" | "reflection" | "event",
      "category": "Praca" | "Zdrowie" | "Relacje" | "Finanse" | "Osobiste" | "Hobby" | "Nauka" | "Dylematy",
      "tags": ["tag1", "tag2"],
      "content": "Treść notatki w 1. osobie"
    }
  ]
}

Błędy walidacji:
${errMsg}

Poprzednia odpowiedź:
${rawText}

Zwróć WYŁĄCZNIE poprawny JSON zgodny z powyższym schematem.`;
        return await aiProviders.structure.generateText([{ role: 'user', content: repairPrompt }], {
          responseFormat: 'json',
          temperature: 0.1,
        });
      };

      const structuredOutput = await validateAndRepairJson(structureResponseText, structureSchema, repairCallback);

      const day = recording.recorded_at.slice(0, 10);
      const docsToInsert: DocumentInsert[] = [];

      for (let i = 0; i < structuredOutput.notes.length; i++) {
        const note: StructuredNote = structuredOutput.notes[i];
        const docId = crypto.randomUUID();

        let categoryId: string | null = null;
        if (note.category) {
          categoryId = await db.getOrCreateCategory(recording.user_id, note.category);
        }

        let slug = generateNoteSlug(day, note.title);
        const exists = await db.slugExists(recording.user_id, slug);
        if (exists) {
          slug = generateNoteSlug(day, note.title, docId);
        }

        const mdPath = `${recording.user_id}/notes/${slug}.md`;
        const bodyMd = renderNoteMarkdown({
          id: docId,
          title: note.title,
          noteType: note.noteType,
          day,
          recordedAt: recording.recorded_at,
          category: note.category,
          tags: note.tags,
          source: recording.source,
          content: note.content,
        });

        // Zapisujemy plik .md w Storage (deterministycznie, bez LLM - ADR-004)
        await storage.uploadMarkdown(mdPath, bodyMd);

        docsToInsert.push({
          id: docId,
          user_id: recording.user_id,
          kind: 'note',
          note_type: note.noteType,
          day,
          title: note.title,
          slug,
          data: {
            title: note.title,
            noteType: note.noteType,
            category: note.category,
            tags: note.tags,
          },
          body_md: bodyMd,
          md_path: mdPath,
          category_id: categoryId,
          tags: note.tags,
          recording_id: recordingId,
          schema_version: 1,
        });
      }

      await db.insertDocuments(docsToInsert);
      await db.updateRecording(recordingId, { status: 'segmented' });
      documents = docsToInsert;
      currentStatus = 'segmented';
    }

    // --- KROK C & D: Chunki, embeddingi oraz powiązania links ---
    for (const doc of documents) {
      // Chunk 0: zawartość notatki
      const chunkText = `${doc.title}\n\n${doc.body_md}`;
      const embeddingVector = await aiProviders.embedding.embed(chunkText);

      const chunk: DocumentChunkInsert = {
        id: crypto.randomUUID(),
        document_id: doc.id,
        user_id: recording.user_id,
        idx: 0,
        content: chunkText,
        embedding: embeddingVector,
        embedding_model: aiProviders.embedding.model,
      };

      await db.insertDocumentChunks([chunk]);

      // Powiązania (links): pobieramy kandydatów
      const candidates = await db.getCandidateDocuments(recording.user_id, doc.id, 10);
      if (candidates.length > 0) {
        const allowedCandidateIds = new Set(candidates.map((c) => c.id));
        const candidateDescriptions = candidates
          .map((c) => `- ID: ${c.id}\n  Tytuł: ${c.title}\n  Fragment: ${c.snippet}`)
          .join('\n');

        const linkTemplate = options.linkPromptTemplate || DEFAULT_LINK_PROMPT;
        const filledLinkPrompt = linkTemplate
          .replace('{{SOURCE_NOTE}}', `Tytuł: ${doc.title}\nTreść: ${doc.body_md}`)
          .replace('{{CANDIDATES}}', candidateDescriptions);

        try {
          const linkRespText = await aiProviders.link.generateText([{ role: 'user', content: filledLinkPrompt }], {
            responseFormat: 'json',
            temperature: 0.1,
          });

          const linkRepairCallback = async (errMsg: string, rawText: string) => {
            const repairPrompt = `Popraw błąd formatu JSON dla powiązań:\n${errMsg}\nPoprzednia odpowiedź:\n${rawText}`;
            return await aiProviders.link.generateText([{ role: 'user', content: repairPrompt }], {
              responseFormat: 'json',
              temperature: 0.1,
            });
          };

          const linkOutput = await validateAndRepairJson(linkRespText, linkSchema, linkRepairCallback);

          // Filtrujemy powiązania: dopuszczamy WYŁĄCZNIE ID z listy kandydatów
          const validLinks: LinkInsert[] = linkOutput.links
            .filter((item: LinkItem) => allowedCandidateIds.has(item.targetId))
            .map((item: LinkItem) => ({
              user_id: recording.user_id,
              source_id: doc.id,
              target_id: item.targetId,
              kind: 'llm' as const,
              score: item.score,
              reason: item.reason,
            }));

          if (validLinks.length > 0) {
            await db.insertLinks(validLinks);
          }
        } catch {
          // Błąd oceny powiązań nie blokuje całego nagrania
        }
      }
    }

    // --- KROK E: Kolejka przebudowy dnia i status 'done' ---
    const day = recording.recorded_at.slice(0, 10);
    await db.upsertDayRebuildQueue(recording.user_id, day);
    await db.updateRecording(recordingId, { status: 'done', last_error: null });

    // Bezpośrednie wywołanie Edge Function build-daily, aby wpis dnia
    // powstał od razu po przetworzeniu nagrania bez konieczności czekania na zewnętrzny cron
    const supabaseUrl = (globalThis as any).Deno?.env?.get('SUPABASE_URL');
    const serviceKey = (globalThis as any).Deno?.env?.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && serviceKey) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/build-daily`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ user_id: recording.user_id, day }),
        });
      } catch (e) {
        console.warn('Błąd natychmiastowego wywołania build-daily z process-recording:', e);
      }
    }

    return {
      recordingId,
      status: 'done',
      documentIds: documents.map((d) => d.id),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await db.updateRecording(recordingId, {
      status: 'failed',
      last_error: errorMsg,
      attempts: (recording.attempts || 0) + 1,
    });

    throw err;
  }
}
