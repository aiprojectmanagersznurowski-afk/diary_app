import {
  alignmentMessage,
  countNotesByRecording,
  filterNotes,
  findDailyForRecording,
  formatLongDate,
  formatNoteWhen,
  formatRecordingSub,
  getProcessingBanner,
  hasNewlyFinished,
  snapshotStatuses,
  localDay,
  pluralNotes,
  pluralRecordings,
  recordingsBadge,
  ringDash,
  sortNotes,
  splitRecordings,
  summarizeRecordings,
} from '../homeLogic';
import { Recording, RecordingStatus } from '../../../../domain/models/Recording';
import { NoteDocument, NoteType } from '../../../../domain/models/NoteDocument';
import { DailyDocument } from '../../../../domain/models/DailyDocument';

const at = (y: number, m: number, d: number, h = 9, min = 10) => new Date(y, m - 1, d, h, min).toISOString();

function rec(id: string, status: RecordingStatus, recordedAt: string, source: 'phone' | 'watch' = 'phone'): Recording {
  return { id, userId: 'u', source, recordedAt, status, attempts: 0 };
}

function note(id: string, noteType: NoteType, createdAt: string, recordingId?: string): NoteDocument {
  return {
    id,
    userId: 'u',
    kind: 'note',
    noteType,
    day: localDay(createdAt),
    title: id,
    slug: id,
    bodyMd: '',
    content: '',
    tags: [],
    recordingId,
    createdAt,
  };
}

const TODAY = '2026-10-06';

describe('formatowanie dat i podpisów', () => {
  it('formatLongDate: dzień tygodnia i miesiąc w dopełniaczu', () => {
    expect(formatLongDate('2026-10-06')).toBe('Wtorek, 6 października');
    expect(formatLongDate('2026-09-29')).toBe('Wtorek, 29 września');
    expect(formatLongDate('2026-01-01')).toBe('Czwartek, 1 stycznia');
  });

  it('formatNoteWhen: dziś, wczoraj i data skrócona', () => {
    expect(formatNoteWhen(at(2026, 10, 6, 9, 5), TODAY)).toBe('dziś 09:05');
    expect(formatNoteWhen(at(2026, 10, 5, 19, 40), TODAY)).toBe('wczoraj 19:40');
    expect(formatNoteWhen(at(2026, 10, 4, 8, 0), TODAY)).toBe('4 paź');
  });

  it('formatRecordingSub: źródło i liczba notatek', () => {
    expect(formatRecordingSub(rec('a', 'queued', at(2026, 10, 6)), TODAY)).toBe('Dziś · iPhone');
    expect(formatRecordingSub(rec('b', 'done', at(2026, 10, 5), 'watch'), TODAY, 3)).toBe(
      'Wczoraj · Apple Watch · 3 notatki',
    );
    expect(formatRecordingSub(rec('c', 'done', at(2026, 10, 1)), TODAY, 1)).toBe('1 paź · iPhone · 1 notatka');
  });

  it('polska odmiana: notatka/notatki/notatek i nagranie/nagrania/nagrań', () => {
    expect([1, 2, 4, 5, 12, 22, 25].map(pluralNotes)).toEqual([
      'notatka',
      'notatki',
      'notatki',
      'notatek',
      'notatek',
      'notatki',
      'notatek',
    ]);
    expect([1, 2, 5, 14, 23].map(pluralRecordings)).toEqual(['nagranie', 'nagrania', 'nagrań', 'nagrań', 'nagrania']);
  });
});

describe('nagrania: liczniki, podział i pasek statusu', () => {
  const recordings = [
    rec('old', 'done', at(2026, 10, 5, 8, 0)),
    rec('sending', 'uploaded', at(2026, 10, 6, 9, 10)),
    rec('failed', 'failed', at(2026, 10, 6, 8, 35)),
    rec('watch', 'segmented', at(2026, 10, 6, 7, 0), 'watch'),
  ];

  it('summarizeRecordings liczy wszystkie, w toku i błędy', () => {
    expect(summarizeRecordings(recordings)).toEqual({ all: 4, active: 2, errors: 1 });
    expect(summarizeRecordings([])).toEqual({ all: 0, active: 0, errors: 0 });
  });

  it('splitRecordings: na żywo (w toku + błędy) i historia (gotowe), od najnowszych', () => {
    const { live, history } = splitRecordings(recordings);
    expect(live.map((r) => r.id)).toEqual(['sending', 'failed', 'watch']);
    expect(history.map((r) => r.id)).toEqual(['old']);
  });

  it('getProcessingBanner: null bez aktywnych, błąd ma pierwszeństwo, inaczej liczba w toku', () => {
    expect(getProcessingBanner([rec('a', 'done', at(2026, 10, 6))])).toBeNull();
    expect(getProcessingBanner(recordings)).toEqual({
      kind: 'error',
      text: 'Błąd przetwarzania nagrania',
      sub: 'Dotknij, aby sprawdzić i ponowić',
    });
    const banner = getProcessingBanner([
      rec('a', 'uploaded', at(2026, 10, 6, 9, 10)),
      rec('b', 'queued', at(2026, 10, 6, 9, 0)),
    ]);
    expect(banner?.kind).toBe('processing');
    expect(banner?.text).toBe('2 nagrania w przetwarzaniu');
    expect(banner?.sub).toBe('W kolejce · dotknij, aby zobaczyć status');
  });

  it('recordingsBadge: licznik w toku i wariant błędu', () => {
    expect(recordingsBadge([rec('a', 'done', at(2026, 10, 6))])).toBeNull();
    expect(recordingsBadge(recordings)).toEqual({ count: 3, error: true });
    expect(recordingsBadge([rec('a', 'queued', at(2026, 10, 6))])).toEqual({ count: 1, error: false });
  });
});

describe('notatki', () => {
  const notes = [
    note('n1', 'idea', at(2026, 10, 6, 9, 0), 'r1'),
    note('n2', 'task', at(2026, 10, 6, 9, 1), 'r1'),
    note('n3', 'idea', at(2026, 10, 5, 8, 0), 'r2'),
    note('n4', 'event', at(2026, 10, 4, 8, 0)),
  ];

  it('filterNotes: wszystkie albo wybrany typ', () => {
    expect(filterNotes(notes, 'all')).toHaveLength(4);
    expect(filterNotes(notes, 'idea').map((n) => n.id)).toEqual(['n1', 'n3']);
    expect(filterNotes(notes, 'reflection')).toEqual([]);
  });

  it('sortNotes: od najnowszych, bez mutacji wejścia', () => {
    const sorted = sortNotes(notes);
    expect(sorted.map((n) => n.id)).toEqual(['n2', 'n1', 'n3', 'n4']);
    expect(notes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3', 'n4']);
  });

  it('countNotesByRecording: zlicza po recordingId, pomija notatki bez nagrania', () => {
    expect(countNotesByRecording(notes)).toEqual({ r1: 2, r2: 1 });
  });
});

describe('wpis dnia dla nagrania i pierścień zgodności', () => {
  it('findDailyForRecording dopasowuje po lokalnym dniu nagrania', () => {
    const docs = [
      { id: 'd5', day: '2026-10-05' },
      { id: 'd6', day: '2026-10-06' },
    ] as DailyDocument[];
    expect(findDailyForRecording(rec('a', 'done', at(2026, 10, 6, 23, 30)), docs)?.id).toBe('d6');
    expect(findDailyForRecording(rec('b', 'done', at(2026, 10, 1)), docs)).toBeUndefined();
  });

  it('alignmentMessage: progi 70 i 40 jak na ekranie Analiz', () => {
    expect(alignmentMessage(72)).toBe('Ostatnie dni świetnie przybliżyły Cię do celów');
    expect(alignmentMessage(70)).toBe('Trzymasz się całkiem nieźle, oby tak dalej');
    expect(alignmentMessage(41)).toBe('Trzymasz się całkiem nieźle, oby tak dalej');
    expect(alignmentMessage(40)).toBe('Bywało lepiej. Pamiętaj, że każdy ma słabsze dni');
  });

  it('ringDash: obwód i część wypełniona, z ograniczeniem do 0–100%', () => {
    const { circumference, dash } = ringDash(50);
    expect(circumference).toBeCloseTo(2 * Math.PI * 36, 5);
    expect(dash).toBe(`${circumference / 2} ${circumference}`);
    expect(ringDash(150).dash).toBe(`${circumference} ${circumference}`);
    expect(ringDash(-10).dash).toBe(`0 ${circumference}`);
  });
});

describe('wykrywanie ukończonych nagrań (podświetlenie wpisu dnia)', () => {
  it('true tylko gdy nagranie znane wcześniej jako w toku jest teraz „done”', () => {
    const before = snapshotStatuses([rec('a', 'segmented', at(2026, 10, 6)), rec('b', 'done', at(2026, 10, 5))]);
    expect(hasNewlyFinished(before, [rec('a', 'done', at(2026, 10, 6)), rec('b', 'done', at(2026, 10, 5))])).toBe(true);
    expect(hasNewlyFinished(before, [rec('a', 'segmented', at(2026, 10, 6)), rec('b', 'done', at(2026, 10, 5))])).toBe(
      false,
    );
  });

  it('pierwsze załadowanie listy i nowe gotowe nagranie spoza migawki nie podświetlają', () => {
    expect(hasNewlyFinished({}, [rec('a', 'done', at(2026, 10, 6))])).toBe(false);
    const before = snapshotStatuses([rec('a', 'done', at(2026, 10, 6))]);
    expect(hasNewlyFinished(before, [rec('a', 'done', at(2026, 10, 6)), rec('new', 'done', at(2026, 10, 6))])).toBe(
      false,
    );
  });

  it('błąd po ponowieniu: failed → done liczy się jako ukończone', () => {
    const before = snapshotStatuses([rec('a', 'failed', at(2026, 10, 6))]);
    expect(hasNewlyFinished(before, [rec('a', 'done', at(2026, 10, 6))])).toBe(true);
  });
});
