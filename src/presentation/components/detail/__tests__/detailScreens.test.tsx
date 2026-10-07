import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { DetailScreen } from '../../../screens/DetailScreen';
import { DailyDetail } from '../DailyDetail';
import { NoteDetail } from '../NoteDetail';
import { DailyDocument } from '../../../../domain/models/DailyDocument';
import { NoteDocument } from '../../../../domain/models/NoteDocument';
import { pl } from '../../../i18n/pl';

type RootRenderer = ReturnType<typeof renderer.create>;
type RootJSON = ReturnType<RootRenderer['toJSON']>;

const mockNavigate = jest.fn();
const mockPush = jest.fn();
let mockRouteParams: { entryId: string } = { entryId: 'daily-1' };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, push: mockPush, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
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
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn().mockResolvedValue('file:///tmp/story.png'),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

let mockDocResult: any = null;
jest.mock('../../../../composition', () => ({
  getDocumentUseCase: {
    execute: jest.fn((id: string) =>
      mockDocResult ? Promise.resolve(mockDocResult) : Promise.reject(new Error('not found')),
    ),
  },
}));

const mockDailyDoc: DailyDocument = {
  id: 'daily-1',
  userId: 'u1',
  kind: 'daily',
  day: '2026-10-07',
  bodyMd: '# Podsumowanie dnia\n\nŚwietny dzień pełen pracy nad Vocaly.',
  mdPath: '2026/10/2026-10-07.md',
  dominantThought: 'Każdy mały krok buduje wielki rezultat.',
  summary: 'Spokojny dzień i postęp w projekcie.',
  quotes: ['Warto dbać o jakość kodu.'],
  impactOnGoals: 'Duży postęp w realizacji celów.',
  goalImpactType: 'positive',
  completedTasks: ['Wdrożenie F9-03', 'Recenzja drugiego agenta'],
  importantEvents: ['Przekazanie sesji od Claude'],
  emotions: ['spokój', 'radość'],
  emotionTriggers: [
    { emotion: 'spokój', trigger: 'Spacer w południe' },
    { emotion: 'radość', trigger: 'Dobre postępy w kodzie' },
  ],
  fatigueLevel: 2,
  stressVsCalm: 'calm',
  gratefulFor: 'Za jasny plan pracy',
  goalAdvice: 'Utrzymuj stały rytm i pamiętaj o odpoczynku.',
  ideas: [
    {
      documentId: 'note-idea-1',
      title: 'System automatycznej synchronizacji Trello',
      oneLiner: 'Skrypt aktualizujący status kart.',
    },
  ],
  tags: ['Agent OS', 'Vocaly', 'Expo'],
  createdAt: '2026-10-07T20:00:00Z',
};

const mockNoteDoc: NoteDocument = {
  id: 'note-1',
  userId: 'u1',
  kind: 'note',
  noteType: 'reflection',
  day: '2026-10-07',
  title: 'Refleksja o architekturze',
  slug: 'refleksja-o-architekturze',
  bodyMd: 'Warto dbać o warstwy w Domain-Driven Design.',
  content: 'Warto dbać o warstwy w Domain-Driven Design.',
  tags: ['architektura'],
  createdAt: '2026-10-07T14:30:00Z',
};

const collectTexts = (node: RootJSON | null): string[] => {
  if (!node) return [];
  const out: string[] = [];
  if (node.type === 'Text' && node.children) {
    const text = node.children
      .map((c: any) => (typeof c === 'string' ? c : ''))
      .join('')
      .trim();
    if (text) out.push(text);
  }
  if (node.children) {
    for (const child of node.children) {
      if (typeof child !== 'string') out.push(...collectTexts(child as RootJSON));
    }
  }
  return out;
};

describe('DetailScreen i komponenty szczegółów', () => {
  let root: RootRenderer | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
      root = null;
    }
  });

  it('DetailScreen pokazuje komunikat o braku wpisu, gdy dokument nie istnieje', async () => {
    mockDocResult = null;
    mockRouteParams = { entryId: 'missing-id' };

    await act(async () => {
      root = renderer.create(<DetailScreen />);
    });

    const texts = collectTexts(root!.toJSON() as RootJSON);
    expect(texts.some((t) => t.includes(pl.detail.notFound) || t.includes('not found'))).toBe(true);
  });

  it('DailyDetail renderuje wszystkie sekcje z briefu §2.6', () => {
    act(() => {
      root = renderer.create(
        <DailyDetail
          daily={mockDailyDoc}
          goals={['Spokój wewnętrzny', 'Rozwój Vocaly']}
          voice="Stoik"
          notes={[mockNoteDoc]}
          related={{ items: [], isLoading: false, error: null }}
          onOpen={jest.fn()}
        />,
      );
    });

    const texts = collectTexts(root!.toJSON() as RootJSON);
    // Myśl dnia
    expect(texts).toContain('MYŚL DNIA');
    expect(texts).toContain('Każdy mały krok buduje wielki rezultat.');
    // Emocje
    expect(texts).toContain('EMOCJE');
    expect(texts).toContain('spokój');
    // Zrobione
    expect(texts).toContain('ZROBIONE');
    expect(texts).toContain('Wdrożenie F9-03');
    // Ważne wydarzenia
    expect(texts).toContain('WAŻNE WYDARZENIA');
    expect(texts).toContain('Przekazanie sesji od Claude');
    // Wpływ na cele
    expect(texts).toContain('WPŁYW NA CELE');
    // Rada z głosem
    expect(texts).toContain('RADA OPARTA NA TWOICH CELACH');
    expect(texts).toContain('Głos: Stoik');
    // Za to jestem wdzięczny
    expect(texts).toContain('ZA TO JESTEM WDZIĘCZNY');
    expect(texts).toContain('Za jasny plan pracy');
    // Pomysły
    expect(texts).toContain('💡 POMYSŁY, NA KTÓRE WPADŁEM');
    expect(texts).toContain('System automatycznej synchronizacji Trello');
    // Najważniejsze słowa
    expect(texts).toContain('NAJWAŻNIEJSZE SŁOWA');
    expect(texts).toContain('Agent OS');
    // Powiązane myśli
    expect(texts).toContain('POWIĄZANE MYŚLI');
  });

  it('DailyDetail pozwala wejść w tryb udostępniania i anulować go', () => {
    act(() => {
      root = renderer.create(
        <DailyDetail
          daily={mockDailyDoc}
          goals={[]}
          voice="Stoik"
          notes={[]}
          related={{ items: [], isLoading: false, error: null }}
          onOpen={jest.fn()}
        />,
      );
    });

    // Znajdź przycisk udostępniania po accessibilityLabel
    const shareBtn = root!.root.findByProps({ accessibilityLabel: pl.detail.a11y.share });
    act(() => {
      shareBtn.props.onPress();
    });

    let texts = collectTexts(root!.toJSON() as RootJSON);
    expect(texts).toContain(pl.detail.share.cancel);
    expect(texts).toContain(pl.detail.share.done);
    expect(texts).toContain(pl.detail.share.selected(1));

    // Anuluj
    const cancelText = root!.root.findByProps({ children: pl.detail.share.cancel });
    let cancelPressable = cancelText.parent;
    while (cancelPressable && typeof cancelPressable.props.onPress !== 'function') {
      cancelPressable = cancelPressable.parent;
    }
    expect(cancelPressable).toBeDefined();
    act(() => {
      cancelPressable!.props.onPress();
    });

    texts = collectTexts(root!.toJSON() as RootJSON);
    expect(texts).not.toContain(pl.detail.share.cancel);
  });

  it('NoteDetail renderuje chip typu, treść notatki i link do wpisu dnia', () => {
    act(() => {
      root = renderer.create(
        <NoteDetail
          note={mockNoteDoc}
          daily={mockDailyDoc}
          recordings={[]}
          related={{ items: [], isLoading: false, error: null }}
          onOpen={jest.fn()}
        />,
      );
    });

    const texts = collectTexts(root!.toJSON() as RootJSON);
    expect(texts).toContain('Refleksja');
    expect(texts).toContain('Refleksja o architekturze');
    expect(texts).toContain('Warto dbać o warstwy w Domain-Driven Design.');
    expect(texts).toContain('WPIS DNIA');
    expect(texts).toContain('POWIĄZANE MYŚLI');
  });

  it('DailyDetail otwiera szufladę podglądu pliku .md i wyświetla treść bodyMd', () => {
    act(() => {
      root = renderer.create(
        <DailyDetail
          daily={mockDailyDoc}
          goals={[]}
          voice="Stoik"
          notes={[]}
          related={{ items: [], isLoading: false, error: null }}
          onOpen={jest.fn()}
        />,
      );
    });

    const mdBtn = root!.root.findByProps({ accessibilityLabel: pl.detail.a11y.md });
    act(() => {
      mdBtn.props.onPress();
    });

    const texts = collectTexts(root!.toJSON() as RootJSON);
    expect(texts).toContain(pl.detail.md.title);
    expect(texts).toContain(mockDailyDoc.bodyMd);
  });

  it('DailyDetail w trybie udostępniania otwiera podgląd story 9:16 po kliknięciu Gotowe', () => {
    act(() => {
      root = renderer.create(
        <DailyDetail
          daily={mockDailyDoc}
          goals={[]}
          voice="Stoik"
          notes={[]}
          related={{ items: [], isLoading: false, error: null }}
          onOpen={jest.fn()}
        />,
      );
    });

    const shareBtn = root!.root.findByProps({ accessibilityLabel: pl.detail.a11y.share });
    act(() => {
      shareBtn.props.onPress();
    });

    const doneText = root!.root.findByProps({ children: pl.detail.share.done });
    let donePressable = doneText.parent;
    while (donePressable && typeof donePressable.props.onPress !== 'function') {
      donePressable = donePressable.parent;
    }
    expect(donePressable).toBeDefined();

    act(() => {
      donePressable!.props.onPress();
    });

    const texts = collectTexts(root!.toJSON() as RootJSON);
    expect(texts).toContain(pl.detail.share.footer);
  });

  it('powiązane myśli wywołują onOpen z identyfikatorem dokumentu po kliknięciu', () => {
    const handleOpen = jest.fn();
    const relatedItem = {
      documentId: 'related-doc-123',
      title: 'Powiązana notatka testowa',
      kind: 'note' as const,
      noteType: 'idea' as const,
      day: '2026-10-07',
      relationType: 'semantic' as const,
      similarity: 0.85,
    };

    act(() => {
      root = renderer.create(
        <DailyDetail
          daily={mockDailyDoc}
          goals={[]}
          voice="Stoik"
          notes={[]}
          related={{ items: [relatedItem], isLoading: false, error: null }}
          onOpen={handleOpen}
        />,
      );
    });

    const thoughtCard = root!.root.findByProps({ accessibilityLabel: 'Powiązana notatka testowa' });
    act(() => {
      thoughtCard.props.onPress();
    });

    expect(handleOpen).toHaveBeenCalledWith('related-doc-123');
  });
});
