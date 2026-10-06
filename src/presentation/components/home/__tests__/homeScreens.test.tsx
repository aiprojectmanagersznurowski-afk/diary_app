import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useDiaryStore, setDiaryDependencies } from '../../../../application/store/useDiaryStore';
import { useNotesStore, setNotesDependencies } from '../../../../application/store/useNotesStore';
import { useGamificationStore } from '../../../../application/store/useGamificationStore';
import { useAuthStore } from '../../../../application/store/useAuthStore';
import { HomeScreen } from '../../../screens/HomeScreen';
import { RecordingsScreen } from '../../../screens/RecordingsScreen';
import { pl } from '../../../i18n/pl';
import { localDay } from '../homeLogic';
import { DailyDocument } from '../../../../domain/models/DailyDocument';
import { NoteDocument } from '../../../../domain/models/NoteDocument';
import { Recording } from '../../../../domain/models/Recording';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(null),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather', Ionicons: 'Ionicons' }));
jest.mock('react-native-confetti-cannon', () => 'ConfettiCannon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const NOW = new Date();
const TODAY = localDay(NOW);
/** Dziś o danej godzinie lokalnej (niezależnie od pory uruchomienia testu). */
const todayAt = (hour: number, minute = 0) =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), hour, minute).toISOString();
const yesterdayAt = (hour: number) =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1, hour).toISOString();

const daily = (id: string, day: string, extra: Partial<DailyDocument> = {}): DailyDocument =>
  ({
    id,
    userId: 'u',
    kind: 'daily',
    day,
    dominantThought: `Myśl ${id}`,
    summary: `Podsumowanie ${id}`,
    emotions: ['Spokój'],
    goalImpactType: 'positive',
    stressVsCalm: 'calm',
    fatigueLevel: 3,
    ...extra,
  }) as DailyDocument;

const noteDoc = (
  id: string,
  noteType: NoteDocument['noteType'],
  createdAt: string,
  recordingId?: string,
): NoteDocument => ({
  id,
  userId: 'u',
  kind: 'note',
  noteType,
  day: TODAY,
  title: `Notatka ${id}`,
  slug: id,
  bodyMd: '',
  content: `Treść ${id}`,
  tags: [],
  recordingId,
  createdAt,
});

const recording = (
  id: string,
  status: Recording['status'],
  recordedAt: string,
  source: Recording['source'] = 'phone',
): Recording => ({
  id,
  userId: 'u',
  source,
  recordedAt,
  status,
  attempts: 0,
});

let dailyDocs: DailyDocument[];
let notes: NoteDocument[];
let recordings: Recording[];
const retryRecording = jest.fn();
const mounted: any[] = [];

async function mountAsync(element: React.ReactElement): Promise<any> {
  let tree: any;
  await act(async () => {
    tree = renderer.create(element);
  });
  mounted.push(tree);
  return tree;
}

const textOf = (node: any) => ([] as unknown[]).concat(node.props.children).join('');
const texts = (tree: any): string[] => tree.root.findAllByType('Text' as never).map(textOf);
const pressable = (tree: any, label: string) =>
  tree.root.find((n: any) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');

beforeEach(() => {
  jest.clearAllMocks();
  dailyDocs = [daily('d-today', TODAY), daily('d-old', '2026-09-29', { emotions: ['Stres', 'Zmęczenie'] })];
  notes = [
    noteDoc('n1', 'idea', todayAt(9, 5), 'r-done'),
    noteDoc('n2', 'task', todayAt(9, 6), 'r-done'),
    noteDoc('n3', 'reflection', yesterdayAt(19)),
  ];
  recordings = [
    recording('r-done', 'done', todayAt(8, 0)),
    recording('r-up', 'uploaded', todayAt(9, 10)),
    recording('r-fail', 'failed', todayAt(8, 35), 'watch'),
  ];

  setDiaryDependencies({
    getDailyDocumentsUseCase: { execute: jest.fn(async () => dailyDocs) } as any,
    recordUseCase: null,
  });
  setNotesDependencies({
    recordingRepository: {
      getRecordings: jest.fn(async () => recordings),
      retryRecording,
      subscribeToRecordings: jest.fn(() => () => {}),
    } as any,
    noteRepository: {
      getNotes: jest.fn(async () => notes),
      subscribeToNotes: jest.fn(() => () => {}),
    } as any,
    watchConnectivity: null,
  });

  act(() => {
    useAuthStore.getState().setUser({ id: 'user-1', email: null, name: null, avatarUrl: null });
    useDiaryStore.setState({ dailyDocuments: [], isLoading: false, isRecording: false, error: null });
    useNotesStore.setState({ recordings: [], notes: [], activeFilter: 'all', error: null });
    useGamificationStore.setState({
      currentStreak: 3,
      unlockedBadges: ['first_step', 'streak_3'],
      newlyUnlockedBadge: null,
      pendingBadges: [],
    });
  });
});

afterEach(() => {
  while (mounted.length) {
    const tree = mounted.pop();
    act(() => tree.unmount());
  }
});

describe('HomeScreen: ekran główny z briefu §2.3', () => {
  it('pokazuje serię, datę, tytuł, wpisy dnia z plakietką „Dziś” i emocjami', async () => {
    const tree = await mountAsync(<HomeScreen />);
    const t = texts(tree);
    expect(t).toContain('3');
    expect(t).toContain(pl.home.title);
    expect(t).toContain(pl.home.today);
    expect(t).toContain(`Myśl d-today`);
    expect(t).toContain('Podsumowanie d-old');
    expect(t).toContain('Zmęczenie');
    expect(t).toContain(pl.home.weekLabel.toUpperCase());
    expect(t).toContain(pl.home.weekLink);
  });

  it('przyciski nagłówka nawigują do Graf, Czat, Nagrania, Osiągnięcia i Ustawienia', async () => {
    const tree = await mountAsync(<HomeScreen />);
    const a11y = pl.home.a11y;
    const cases: [string, string][] = [
      [a11y.graph, 'Graph'],
      [a11y.chat, 'Chat'],
      [a11y.recordings, 'Recordings'],
      [a11y.badges, 'Badges'],
      [a11y.settings, 'Settings'],
    ];
    for (const [label, route] of cases) {
      mockNavigate.mockClear();
      act(() => {
        pressable(tree, label).props.onPress();
      });
      expect(mockNavigate).toHaveBeenCalledWith(route);
    }
    mockNavigate.mockClear();
    act(() => {
      pressable(tree, a11y.streak).props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Badges');
  });

  it('karta tygodnia otwiera Analizy', async () => {
    const tree = await mountAsync(<HomeScreen />);
    act(() => {
      pressable(tree, pl.home.weekLabel).props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Insights');
  });

  it('pasek statusu pojawia się przy nagraniach w toku/błędzie i otwiera ekran Nagrania', async () => {
    const tree = await mountAsync(<HomeScreen />);
    expect(texts(tree)).toContain('Błąd przetwarzania nagrania');
    act(() => {
      pressable(tree, 'Błąd przetwarzania nagrania').props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Recordings');
  });

  it('bez nagrań w toku pasek statusu nie jest widoczny', async () => {
    recordings = [recording('r-done', 'done', todayAt(8, 0))];
    const tree = await mountAsync(<HomeScreen />);
    const t = texts(tree);
    expect(t.some((x) => x.includes('w przetwarzaniu'))).toBe(false);
    expect(t).not.toContain('Błąd przetwarzania nagrania');
  });

  it('tap w wpis dnia otwiera Detail z UUID dokumentu', async () => {
    const tree = await mountAsync(<HomeScreen />);
    const label = pressable(tree, 'Wtorek, 29 września');
    act(() => {
      label.props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Detail', { entryId: 'd-old' });
  });

  it('zakładka Notatki: licznik, filtry faktycznie filtrują, tap otwiera notatkę', async () => {
    const tree = await mountAsync(<HomeScreen />);
    expect(texts(tree)).toContain(pl.home.tabNotes(3));

    const segment = tree.root.find(
      (n: any) =>
        n.props.accessibilityRole === 'button' &&
        typeof n.props.onPress === 'function' &&
        n.findAllByType('Text' as never).some((t: any) => textOf(t) === pl.home.tabNotes(3)),
    );
    act(() => {
      segment.props.onPress();
    });
    expect(texts(tree)).toEqual(expect.arrayContaining(['Notatka n1', 'Notatka n2', 'Notatka n3']));
    expect(texts(tree)).not.toContain(pl.home.emptyNotes);

    const ideaChip = tree.root.find(
      (n: any) =>
        n.props.accessibilityRole === 'button' &&
        typeof n.props.onPress === 'function' &&
        n.findAllByType('Text' as never).some((t: any) => textOf(t) === pl.home.filters.idea),
    );
    act(() => {
      ideaChip.props.onPress();
    });
    const filtered = texts(tree);
    expect(filtered).toContain('Notatka n1');
    expect(filtered).not.toContain('Notatka n2');
    expect(filtered).not.toContain('Notatka n3');

    act(() => {
      pressable(tree, 'Notatka n1').props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Detail', { entryId: 'n1' });

    const reflectionChip = tree.root.find(
      (n: any) =>
        n.props.accessibilityRole === 'button' &&
        typeof n.props.onPress === 'function' &&
        n.findAllByType('Text' as never).some((t: any) => textOf(t) === pl.home.filters.event),
    );
    act(() => {
      reflectionChip.props.onPress();
    });
    expect(texts(tree)).toContain(pl.home.emptyNotes);
  });

  it('pusta lista wpisów pokazuje komunikat z briefu', async () => {
    dailyDocs = [];
    const tree = await mountAsync(<HomeScreen />);
    expect(texts(tree)).toContain(pl.home.emptyEntries);
  });

  it('przyznaje odznaki wynikające z serii i pokazuje modal z kolejki', async () => {
    useGamificationStore.setState({
      currentStreak: 7,
      unlockedBadges: ['first_step', 'streak_3'],
      newlyUnlockedBadge: null,
      pendingBadges: [],
    });
    const tree = await mountAsync(<HomeScreen />);
    expect(useGamificationStore.getState().unlockedBadges).toContain('streak_7');
    expect(texts(tree)).toContain(pl.badge.header);
    expect(texts(tree)).toContain('Tydzień Świadomości');
  });
});

describe('RecordingsScreen: ekran Nagrania z briefu §2.5', () => {
  it('pokazuje liczniki, nagrania na żywo i listę gotowych z liczbą notatek', async () => {
    useNotesStore.setState({ recordings, notes });
    const tree = await mountAsync(<RecordingsScreen />);
    const t = texts(tree);
    expect(t).toContain(pl.recordings.title);
    expect(t).toContain(pl.recordings.liveLabel.toUpperCase());
    expect(t).toContain(pl.recordings.historyLabel.toUpperCase());
    expect(t).toContain('Błąd');
    expect(t).toContain(pl.recordings.retry);
    expect(t.some((x) => x.includes('Apple Watch'))).toBe(true);
    expect(t.some((x) => x.includes('2 notatki'))).toBe(true);
    // liczniki: wszystkie 3, w toku 1 (uploaded), błędy 1 (failed nie liczy się jako „w toku”)
    expect(t.filter((x) => x === '3')).toHaveLength(1);
    expect(t.filter((x) => x === '1')).toHaveLength(2);
  });

  it('„Ponów przetwarzanie” wywołuje retryRecording dla nagrania z błędem', async () => {
    useNotesStore.setState({ recordings, notes });
    const tree = await mountAsync(<RecordingsScreen />);
    const retry = tree.root.find(
      (n: any) =>
        n.props.accessibilityRole === 'button' &&
        typeof n.props.onPress === 'function' &&
        n.findAllByType('Text' as never).some((t: any) => textOf(t) === pl.recordings.retry),
    );
    await act(async () => {
      await retry.props.onPress();
    });
    expect(retryRecording).toHaveBeenCalledWith('r-fail');
  });

  it('tap w gotowe nagranie otwiera wpis dnia z jego dnia', async () => {
    useNotesStore.setState({ recordings, notes });
    useDiaryStore.setState({ dailyDocuments: dailyDocs });
    const tree = await mountAsync(<RecordingsScreen />);
    const row = tree.root.find(
      (n: any) =>
        n.props.accessibilityRole === 'button' &&
        typeof n.props.onPress === 'function' &&
        String(n.props.accessibilityLabel ?? '').startsWith('Nagranie z '),
    );
    act(() => {
      row.props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Detail', { entryId: 'd-today' });
  });

  it('puste listy pokazują komunikaty z briefu', async () => {
    recordings = [];
    const tree = await mountAsync(<RecordingsScreen />);
    const t = texts(tree);
    expect(t).toContain(pl.recordings.liveEmpty);
    expect(t).toContain(pl.recordings.historyEmpty);
  });
});
