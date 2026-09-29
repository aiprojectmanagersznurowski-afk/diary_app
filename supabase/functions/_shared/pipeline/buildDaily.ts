import { IBuildDailyDatabaseClient, DocumentInsert, DocumentChunkInsert, NoteRow, ProfileRow } from '../db/types.ts';
import { AiProviders } from '../ai/factory.ts';
import { digestSchema, DigestOutput, DigestIdea } from '../schemas/digest.ts';
import { validateAndRepairJson } from '../ai/validate.ts';
import { renderDailyMarkdown, DailyMdContext } from '../markdown/dailyTemplate.ts';

// ── Types ──────────────────────────────────────────────────────────────

export interface BuildDailyOptions {
  userId: string;
  day: string;
  db: IBuildDailyDatabaseClient;
  aiProviders: AiProviders;
  digestPromptTemplate?: string;
}

export interface BuildDailyResult {
  userId: string;
  day: string;
  status: 'done' | 'skipped';
  dailyDocId: string | null;
}

// ── Personality loader ─────────────────────────────────────────────────

const PERSONALITY_CACHE: Record<string, string> = {};

async function loadPersonalityPrompt(name: string): Promise<string> {
  if (!name) return '';
  const key = name.toLowerCase().replace(/\s+/g, '-');
  if (PERSONALITY_CACHE[key]) return PERSONALITY_CACHE[key];

  const candidates = [`${key}.v1.md`, `${key.replace(/-/g, '_')}.v1.md`];

  for (const filename of candidates) {
    try {
      const path = new URL(`../prompts/personalities/${filename}`, import.meta.url);
      const raw = await Deno.readTextFile(path);
      const match = raw.match(/^---[\s\S]*?---\n?([\s\S]*)$/);
      const content = match ? match[1].trim() : raw.trim();
      PERSONALITY_CACHE[key] = content;
      return content;
    } catch {
      // Plik nieznaleziony, próbujemy kolejnego kandydata
    }
  }

  PERSONALITY_CACHE[key] = `Pisz z perspektywy i w stylu osobowości: ${name}.`;
  return PERSONALITY_CACHE[key];
}

// ── Digest prompt loader (_shared/prompts/digest.v1.md, nagłówek schema:) ──

let digestPromptCache: string | null = null;

async function loadDigestPromptTemplate(): Promise<string> {
  if (digestPromptCache) return digestPromptCache;
  const path = new URL('../prompts/digest.v1.md', import.meta.url);
  const raw = await Deno.readTextFile(path);
  const match = raw.match(/^---[\s\S]*?---\n?([\s\S]*)$/);
  const content = (match ? match[1] : raw).trim();
  digestPromptCache = content;
  return content;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatNotesForPrompt(notes: NoteRow[]): string {
  return notes
    .map((n, i) => {
      const header = `[Notatka ${i + 1}] ID: ${n.id} | Typ: ${n.note_type} | Tytuł: ${n.title}`;
      return `${header}\n${n.body_md}`;
    })
    .join('\n\n---\n\n');
}

function formatGoalsForPrompt(goals: string[] | null): string {
  if (!goals || goals.length === 0) return '(brak zdefiniowanych celów)';
  return goals.map((g, i) => `${i + 1}. ${g}`).join('\n');
}

function extractTimeFromISO(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Liczy serię po zapisaniu wpisu dnia. Jeśli poprzedni wpis był wczoraj, seria rośnie.
 * Jeśli był dzisiaj (przebudowa tego samego dnia), seria się nie zmienia. W przeciwnym razie reset do 1.
 */
function computeStreak(profile: ProfileRow, currentDay: string): { current_streak: number; last_entry_day: string } {
  if (profile.last_entry_day === currentDay) {
    return { current_streak: profile.current_streak, last_entry_day: currentDay };
  }

  const today = new Date(`${currentDay}T00:00:00Z`);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (profile.last_entry_day === yesterdayStr) {
    return { current_streak: (profile.current_streak || 0) + 1, last_entry_day: currentDay };
  }

  return { current_streak: 1, last_entry_day: currentDay };
}

// ── Pipeline ───────────────────────────────────────────────────────────

/**
 * Buduje (lub przebudowuje) wpis dnia dla pojedynczego user_id+day.
 * Kroki z docs/02-architektura.md §6.3:
 *   a. Pobranie notatek, celów, osobowości
 *   b. LLM: analiza dnia -> DigestOutput (zod, ADR-005: pomysły tylko z podanych ID)
 *   c. UPSERT documents (kind='daily') -> render .md (bez LLM, ADR-004) -> chunki + embeddingi
 *   d. links kind='day' (wpis dnia -> notatki dnia)
 *   e. aktualizacja serii/odznak w profiles
 * Idempotentne: ponowne wywołanie dla tego samego dnia aktualizuje ten sam wiersz (ten sam id).
 */
export async function buildDailySingle(options: BuildDailyOptions): Promise<BuildDailyResult> {
  const { userId, day, db, aiProviders } = options;

  const notes = await db.getNotesForDay(userId, day);

  if (notes.length === 0) {
    await db.deleteDayRebuildQueueEntry(userId, day);
    return { userId, day, status: 'skipped', dailyDocId: null };
  }

  const profile = await db.getProfile(userId);
  if (!profile) {
    throw new Error(`Profil użytkownika ${userId} nie istnieje`);
  }

  const personalityPrompt = await loadPersonalityPrompt(profile.ai_personality || '');

  const dayNotesText = formatNotesForPrompt(notes);
  const goalsText = formatGoalsForPrompt(profile.life_goals);

  const promptTemplate = options.digestPromptTemplate || (await loadDigestPromptTemplate());
  const filledPrompt = promptTemplate
    .replace('{{PERSONALITY_PROMPT}}', personalityPrompt)
    .replace('{{LIFE_GOALS}}', goalsText)
    .replace('{{DAY_NOTES}}', dayNotesText);

  const digestRawText = await aiProviders.digest.generateText([{ role: 'user', content: filledPrompt }]);

  const repairCallback = async (errMsg: string, rawText: string) => {
    const repairPrompt = `Popraw poniższy błąd w formacie JSON wpisu dnia:\nBłąd: ${errMsg}\nPoprzednia odpowiedź: ${rawText}`;
    return await aiProviders.digest.generateText([{ role: 'user', content: repairPrompt }]);
  };

  const digest: DigestOutput = await validateAndRepairJson(digestRawText, digestSchema, repairCallback);

  // ADR-005: pomysły LLM mogą wskazywać wyłącznie ID notatek faktycznie dostępnych tego dnia
  const noteIds = new Set(notes.map((n) => n.id));
  digest.ideas = (digest.ideas ?? []).filter((idea: DigestIdea) => noteIds.has(idea.documentId));

  const existingDaily = await db.getDailyDocument(userId, day);
  const dailyDocId = existingDaily?.id || crypto.randomUUID();
  const slug = day; // slug wpisu dnia to sama data: 2026-09-23
  const mdPath = `${userId}/daily/${day}.md`;

  const noteSlugs = notes.map((n) => ({
    id: n.id,
    slug: n.slug,
    title: n.title,
    time: extractTimeFromISO(n.created_at),
  }));

  const recordingIds = [...new Set(notes.map((n) => n.recording_id).filter((id): id is string => !!id))];
  const recordings = recordingIds.length > 0 ? await db.getRecordingsByIds(recordingIds) : [];
  const recordingTimes = recordings
    .map((r) => extractTimeFromISO(r.recorded_at))
    .filter((t) => t !== '')
    .sort();

  const allTags = new Set<string>();
  for (const n of notes) {
    for (const t of n.tags ?? []) {
      allTags.add(t);
    }
  }
  const tags = [...allTags];

  const mdContext: DailyMdContext = {
    day,
    personality: profile.ai_personality || '',
    digest,
    tags,
    noteSlugs,
    recordingTimes,
  };

  const bodyMd = renderDailyMarkdown(mdContext);

  const dailyDoc: DocumentInsert = {
    id: dailyDocId,
    user_id: userId,
    kind: 'daily',
    note_type: null,
    day,
    title: day,
    slug,
    data: { ...digest },
    body_md: bodyMd,
    md_path: mdPath,
    category_id: null,
    tags,
    recording_id: null,
    schema_version: 1,
  };

  await db.upsertDailyDocument(dailyDoc);
  await db.uploadMarkdown(mdPath, bodyMd);

  const chunkText = `Wpis dnia ${day}\n\n${digest.summary}`;
  const embeddingVector = await aiProviders.embedding.embed(chunkText);

  const chunk: DocumentChunkInsert = {
    id: crypto.randomUUID(),
    document_id: dailyDocId,
    user_id: userId,
    idx: 0,
    content: chunkText,
    embedding: embeddingVector,
    embedding_model: aiProviders.embedding.model,
  };

  await db.replaceDocumentChunks(dailyDocId, [chunk]);
  await db.replaceDayLinks(
    userId,
    dailyDocId,
    notes.map((n) => n.id),
  );

  const streakUpdate = computeStreak(profile, day);
  await db.updateProfile(userId, streakUpdate);

  await db.deleteDayRebuildQueueEntry(userId, day);

  return { userId, day, status: 'done', dailyDocId };
}
