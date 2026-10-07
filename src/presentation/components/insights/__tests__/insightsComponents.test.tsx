import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AverageTiles } from '../AverageTiles';
import { EnergyBarChart } from '../EnergyBarChart';
import { GoalAlignmentRing } from '../GoalAlignmentRing';
import { StressCalmChart } from '../StressCalmChart';
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
  it('AverageTiles renderuje wartości średnich stresu, spokoju i energii', () => {
    let tree: RootRenderer;
    act(() => {
      tree = renderer.create(<AverageTiles avgStress={25} avgCalm={70} avgEnergy={80} />);
    });
    const texts = flattenTexts(tree!.toJSON());
    expect(texts).toContain('25%');
    expect(texts).toContain('70%');
    expect(texts).toContain('80%');
    expect(texts).toContain(pl.insights.avgStress);
    expect(texts).toContain(pl.insights.avgCalm);
    expect(texts).toContain(pl.insights.avgEnergy);
  });

  it('EnergyBarChart renderuje słupki energii oraz podaną notatkę', () => {
    let tree: RootRenderer;
    act(() => {
      tree = renderer.create(
        <EnergyBarChart
          energy={[
            { value: 60, label: 'Pon' },
            { value: 90, label: 'Wto' },
          ]}
          energyNote="Najwyższa w Wto"
        />,
      );
    });
    const texts = flattenTexts(tree!.toJSON());
    expect(texts).toContain(pl.insights.energy.toUpperCase());
    expect(texts).toContain('Najwyższa w Wto');
    expect(texts).toContain('Pon');
    expect(texts).toContain('Wto');
  });

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

  it('StressCalmChart renderuje legendę i etykiety punktów', () => {
    let tree: RootRenderer;
    act(() => {
      tree = renderer.create(
        <StressCalmChart stress={[{ value: 20, label: 'Pon' }]} calm={[{ value: 80, label: 'Pon' }]} />,
      );
    });
    const texts = flattenTexts(tree!.toJSON());
    expect(texts).toContain(pl.insights.stressVsCalm.toUpperCase());
    expect(texts).toContain(pl.insights.stress);
    expect(texts).toContain(pl.insights.calm);
    expect(texts).toContain('Pon');
  });

  it('InsightsScreen ładuje i wyświetla dane analityczne oraz przełącznik zakresu', async () => {
    let tree: RootRenderer;
    await act(async () => {
      tree = renderer.create(<InsightsScreen />);
      // poczekaj na resolved promise z getDailyDocumentsInRangeUseCase
      await Promise.resolve();
    });

    const texts = flattenTexts(tree!.toJSON());
    expect(texts).toContain(pl.insights.barTitle);
    expect(texts).toContain(pl.insights.title);
    expect(texts).toContain(pl.insights.range7);
    expect(texts).toContain(pl.insights.range30);
  });
});
