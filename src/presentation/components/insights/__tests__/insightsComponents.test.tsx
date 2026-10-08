import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { GoalAlignmentRing } from '../GoalAlignmentRing';
import { GoalAlignmentHistoryChart } from '../GoalAlignmentHistoryChart';
import { DominantEmotionsHistogram } from '../DominantEmotionsHistogram';
import { InsightsScreen } from '../../../screens/InsightsScreen';
import { pl } from '../../../i18n/pl';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(null),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
}));

jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather', Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockDailyDocs = [
  {
    id: 'd1',
    userId: 'u1',
    kind: 'daily',
    day: '2026-10-07',
    bodyMd: 'Dzień',
    stressVsCalm: 'calm' as const,
    goalImpactType: 'positive' as const,
    fatigueLevel: 2,
    emotions: ['spokój', 'motywacja'],
    createdAt: '2026-10-07T12:00:00Z',
    updatedAt: '2026-10-07T12:00:00Z',
  },
];

jest.mock('../../../../composition', () => ({
  getDailyDocumentsInRangeUseCase: {
    execute: jest.fn(() => Promise.resolve(mockDailyDocs)),
  },
}));

type RootRenderer = ReturnType<typeof renderer.create>;

function flattenTexts(node: any): string[] {
  if (!node) return [];
  if (typeof node === 'string') return [node];
  if (typeof node === 'number') return [String(node)];
  const children = node.children || [];
  return children.flatMap(flattenTexts);
}

describe('komponenty analityczne (docs/08-design-ui.md §2.8)', () => {
  it('GoalAlignmentRing renderuje procent zgodności i właściwy komunikat', () => {
    let tree: RootRenderer;
    act(() => {
      tree = renderer.create(
        <GoalAlignmentRing percentage={72} message="Ostatnie dni świetnie przybliżyły Cię do celów." />,
      );
    });
    const texts = flattenTexts(tree!.toJSON());
    expect(texts).toContain('72%');
    expect(texts).toContain(pl.insights.alignmentWord);
    expect(texts).toContain('Ostatnie dni świetnie przybliżyły Cię do celów.');
  });

  it('GoalAlignmentHistoryChart renderuje etykiety dni i legendę wpływu na cele', () => {
    let tree: RootRenderer;
    act(() => {
      tree = renderer.create(
        <GoalAlignmentHistoryChart
          history={[
            { day: '2026-10-06', label: 'Pon', score: 100, status: 'positive' },
            { day: '2026-10-07', label: 'Wto', score: 50, status: 'neutral' },
          ]}
          timeRange="7d"
        />,
      );
    });
    const texts = flattenTexts(tree!.toJSON());
    expect(texts).toContain(pl.insights.goalHistory.toUpperCase());
    expect(texts).toContain(pl.insights.goalHistorySubtitle);
    expect(texts).toContain('Pon');
    expect(texts).toContain('Wto');
    expect(texts).toContain(pl.insights.positiveImpact);
    expect(texts).toContain(pl.insights.neutralImpact);
    expect(texts).toContain(pl.insights.emptyDay);
  });

  it('DominantEmotionsHistogram renderuje nazwy emocji i statystyki', () => {
    let tree: RootRenderer;
    act(() => {
      tree = renderer.create(
        <DominantEmotionsHistogram
          emotions={[
            { emotion: 'radość', count: 5, percentage: 60, color: '#FF9AA2' },
            { emotion: 'spokój', count: 3, percentage: 40, color: '#B5EAD7' },
          ]}
        />,
      );
    });
    const texts = flattenTexts(tree!.toJSON());
    expect(texts).toContain(pl.insights.dominantEmotions.toUpperCase());
    expect(texts).toContain(pl.insights.dominantEmotionsSubtitle);
    expect(texts).toContain('Radość');
    expect(texts).toContain('Spokój');
    expect(texts).toContain(`5 ${pl.insights.occurrences} (60%)`);
    expect(texts).toContain(`3 ${pl.insights.occurrences} (40%)`);
  });

  it('DominantEmotionsHistogram renderuje pusty stan, gdy brak emocji', () => {
    let tree: RootRenderer;
    act(() => {
      tree = renderer.create(<DominantEmotionsHistogram emotions={[]} />);
    });
    const texts = flattenTexts(tree!.toJSON());
    expect(texts).toContain(pl.insights.dominantEmotionsEmpty);
  });

  it('InsightsScreen ładuje i wyświetla dane analityczne oraz przełącznik zakresu', async () => {
    let tree: RootRenderer;
    await act(async () => {
      tree = renderer.create(<InsightsScreen />);
      await Promise.resolve();
    });

    const texts = flattenTexts(tree!.toJSON());
    expect(texts).toContain(pl.insights.barTitle);
    expect(texts).toContain(pl.insights.title);
    expect(texts).toContain(pl.insights.range7);
    expect(texts).toContain(pl.insights.range30);
  });
});
