import { Recording, isRecordingInProgress } from '../../../domain/models/Recording';
import { NoteDocument, NoteType } from '../../../domain/models/NoteDocument';
import { DailyDocument } from '../../../domain/models/DailyDocument';

const WEEKDAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
const MONTHS_GEN = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];
const MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

const two = (n: number) => String(n).padStart(2, '0');

/** Dzień kalendarzowy (YYYY-MM-DD) w lokalnej strefie urządzenia. */
export function localDay(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** „Wtorek, 6 października” dla dnia YYYY-MM-DD. */
export function formatLongDate(day: string): string {
  const d = parseDay(day);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
}

function dayDiff(day: string, today: string): number {
  return Math.round((parseDay(today).getTime() - parseDay(day).getTime()) / 86_400_000);
}

/** „Dziś” / „Wczoraj” / „4 paź” — wskazanie dnia w podpisach. */
export function formatRelativeDay(day: string, today: string): string {
  const diff = dayDiff(day, today);
  if (diff === 0) return 'Dziś';
  if (diff === 1) return 'Wczoraj';
  const d = parseDay(day);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** Czas notatki na liście: „dziś 09:10”, „wczoraj 19:40” albo „4 paź”. */
export function formatNoteWhen(createdAtIso: string, today: string): string {
  const day = localDay(createdAtIso);
  const diff = dayDiff(day, today);
  if (diff === 0) return `dziś ${formatClock(createdAtIso)}`;
  if (diff === 1) return `wczoraj ${formatClock(createdAtIso)}`;
  return formatRelativeDay(day, today);
}

export function formatSource(source: string): string {
  return source === 'watch' ? 'Apple Watch' : 'iPhone';
}

/** Podpis wiersza nagrania: „Dziś · iPhone” (+ „ · 3 notatki” dla gotowych). */
export function formatRecordingSub(recording: Recording, today: string, noteCount?: number): string {
  const base = `${formatRelativeDay(localDay(recording.recordedAt), today)} · ${formatSource(recording.source)}`;
  if (!noteCount) return base;
  return `${base} · ${noteCount} ${pluralNotes(noteCount)}`;
}

export function pluralNotes(n: number): string {
  if (n === 1) return 'notatka';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'notatki';
  return 'notatek';
}

export function pluralRecordings(n: number): string {
  if (n === 1) return 'nagranie';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'nagrania';
  return 'nagrań';
}

export interface RecordingSummary {
  all: number;
  active: number;
  errors: number;
}

/** Liczniki z ekranu Nagrania: wszystkie / w toku / błędy. */
export function summarizeRecordings(recordings: Recording[]): RecordingSummary {
  const errors = recordings.filter((r) => r.status === 'failed').length;
  const active = recordings.filter((r) => isRecordingInProgress(r.status)).length;
  return { all: recordings.length, active, errors };
}

/** „Na żywo” = w toku lub z błędem; „historia” = gotowe. Obie listy od najnowszych. */
export function splitRecordings(recordings: Recording[]): { live: Recording[]; history: Recording[] } {
  const byNewest = [...recordings].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  return {
    live: byNewest.filter((r) => r.status !== 'done'),
    history: byNewest.filter((r) => r.status === 'done'),
  };
}

export interface ProcessingBanner {
  kind: 'processing' | 'error';
  text: string;
  sub: string;
}

const STAGE_LABEL: Record<string, string> = {
  queued: 'W kolejce',
  uploaded: 'Wysłane',
  transcribed: 'Transkrypcja...',
  segmented: 'Podział na notatki...',
};

/** Pasek statusu na ekranie głównym; `null`, gdy nic nie jest w toku ani w błędzie. */
export function getProcessingBanner(recordings: Recording[]): ProcessingBanner | null {
  const { live } = splitRecordings(recordings);
  if (live.length === 0) return null;
  const errors = live.filter((r) => r.status === 'failed');
  if (errors.length > 0) {
    return { kind: 'error', text: 'Błąd przetwarzania nagrania', sub: 'Dotknij, aby sprawdzić i ponowić' };
  }
  const first = live[live.length - 1];
  return {
    kind: 'processing',
    text: `${live.length} ${pluralRecordings(live.length)} w przetwarzaniu`,
    sub: `${STAGE_LABEL[first.status] ?? 'Przetwarzanie'} · dotknij, aby zobaczyć status`,
  };
}

export function filterNotes(notes: NoteDocument[], filter: NoteType | 'all'): NoteDocument[] {
  return filter === 'all' ? notes : notes.filter((n) => n.noteType === filter);
}

/** Notatki od najnowszych. */
export function sortNotes(notes: NoteDocument[]): NoteDocument[] {
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function countNotesByRecording(notes: NoteDocument[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const note of notes) {
    if (note.recordingId) counts[note.recordingId] = (counts[note.recordingId] ?? 0) + 1;
  }
  return counts;
}

/** Wpis dnia, do którego należy nagranie (po lokalnym dniu nagrania). */
export function findDailyForRecording(recording: Recording, dailyDocs: DailyDocument[]): DailyDocument | undefined {
  const day = localDay(recording.recordedAt);
  return dailyDocs.find((d) => d.day === day);
}

/** Komunikat pod pierścieniem zgodności z celami (te same progi co ekran Analiz). */
export function alignmentMessage(percent: number): string {
  if (percent > 70) return 'Ostatnie dni świetnie przybliżyły Cię do celów';
  if (percent > 40) return 'Trzymasz się całkiem nieźle, oby tak dalej';
  return 'Bywało lepiej. Pamiętaj, że każdy ma słabsze dni';
}

/** Długość obwodu pierścienia dla promienia 36 (SVG 88×88) i dash dla danego procentu. */
export function ringDash(percent: number, radius = 36): { circumference: number; dash: string } {
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  return { circumference, dash: `${(circumference * clamped) / 100} ${circumference}` };
}

/** Liczba nagrań w toku do plakietki przycisku w nagłówku i jej wariant. */
export function recordingsBadge(recordings: Recording[]): { count: number; error: boolean } | null {
  const { live } = splitRecordings(recordings);
  if (live.length === 0) return null;
  return { count: live.length, error: live.some((r) => r.status === 'failed') };
}

/** Migawka statusów nagrań (id → status) do wykrywania przejścia w „Gotowe”. */
export function snapshotStatuses(recordings: Recording[]): Record<string, string> {
  return Object.fromEntries(recordings.map((r) => [r.id, r.status]));
}

/** Czy któreś nagranie przeszło właśnie z „w toku” do „Gotowe” względem poprzedniej migawki? */
export function hasNewlyFinished(previous: Record<string, string>, recordings: Recording[]): boolean {
  return recordings.some((r) => r.status === 'done' && previous[r.id] !== undefined && previous[r.id] !== 'done');
}
