import React from 'react';
import { Alert } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { PersonalityRadio, PERSONALITY_OPTIONS } from '../PersonalityRadio';
import { ThemeSelector } from '../ThemeSelector';
import { ManagementCard } from '../ManagementCard';
import { SettingsScreen } from '../../../screens/SettingsScreen';
import { BadgesScreen } from '../../../screens/BadgesScreen';
import { useSettingsStore } from '../../../../application/store/useSettingsStore';
import { useGamificationStore } from '../../../../application/store/useGamificationStore';
import { pl } from '../../../i18n/pl';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(null),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
  },
}));

const mockGoBack = jest.fn();
const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, reset: mockReset, navigate: jest.fn() }),
}));

jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather', Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockSignOut = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../composition', () => ({
  useAuthService: () => ({
    signOut: mockSignOut,
  }),
}));

type RootRenderer = ReturnType<typeof renderer.create>;

function flattenTexts(node: any): string[] {
  if (!node) return [];
  if (typeof node === 'string') return [node];
  if (typeof node === 'number') return [String(node)];
  const children = node.children || [];
  return children.flatMap(flattenTexts);
}

describe('komponenty ustawień i ekran osiągnięć (docs/08-design-ui.md §2.9–§2.10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PersonalityRadio', () => {
    it('renderuje wszystkie 4 osobowości oraz podgląd wybranej rady', () => {
      let tree: RootRenderer;
      act(() => {
        tree = renderer.create(<PersonalityRadio selected="Buddha" onSelect={jest.fn()} />);
      });
      const texts = flattenTexts(tree!.toJSON());
      for (const opt of PERSONALITY_OPTIONS) {
        expect(texts).toContain(opt.name);
        expect(texts).toContain(opt.desc);
      }
      expect(texts).toContain(pl.settings.personalities.buddha.preview);
    });

    it('wywołuje onSelect po kliknięciu wybranej opcji', () => {
      const onSelect = jest.fn();
      let tree: RootRenderer;
      act(() => {
        tree = renderer.create(<PersonalityRadio selected="Po prostu przyjaciel" onSelect={onSelect} />);
      });

      const pressables = tree!.root.findAll(
        (node: any) => node.props.accessibilityRole === 'radio' && typeof node.props.onPress === 'function',
      );
      expect(pressables.length).toBe(6);
      act(() => {
        pressables[1].props.onPress();
      });
      expect(onSelect).toHaveBeenCalledWith('Buddha');
    });
  });

  describe('ThemeSelector', () => {
    it('renderuje 3 opcje motywów i reaguje na wybór', () => {
      const onSelect = jest.fn();
      let tree: RootRenderer;
      act(() => {
        tree = renderer.create(<ThemeSelector selected="AppleDark" onSelect={onSelect} />);
      });

      const texts = flattenTexts(tree!.toJSON());
      expect(texts).toContain(pl.settings.themes.dark);
      expect(texts).toContain(pl.settings.themes.light);
      expect(texts).toContain(pl.settings.themes.sepia);

      const buttons = tree!.root.findAll(
        (node: any) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function',
      );
      expect(buttons.length).toBe(3);
      act(() => {
        buttons[2].props.onPress(); // Sepia
      });
      expect(onSelect).toHaveBeenCalledWith('Sepia');
    });
  });

  describe('ManagementCard', () => {
    it('pokazuje alert z potwierdzeniem przed zresetowaniem celów', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const onResetGoals = jest.fn();
      const onLogout = jest.fn();

      let tree: RootRenderer;
      act(() => {
        tree = renderer.create(<ManagementCard onResetGoals={onResetGoals} onLogout={onLogout} />);
      });

      const buttons = tree!.root.findAll(
        (node: any) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function',
      );
      // Przycisk resetu celów
      act(() => {
        buttons[0].props.onPress();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        pl.settings.alerts.resetTitle,
        pl.settings.alerts.resetMsg,
        expect.arrayContaining([
          expect.objectContaining({ text: pl.common.cancel, style: 'cancel' }),
          expect.objectContaining({ text: pl.settings.alerts.resetConfirm, style: 'destructive' }),
        ]),
      );

      // Wywołanie akcji potwierdzenia
      const confirmButton = alertSpy.mock.calls[0][2]?.find((b) => b.text === pl.settings.alerts.resetConfirm);
      confirmButton?.onPress?.();
      expect(onResetGoals).toHaveBeenCalled();
    });

    it('pokazuje alert z potwierdzeniem przed wylogowaniem', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const onResetGoals = jest.fn();
      const onLogout = jest.fn();

      let tree: RootRenderer;
      act(() => {
        tree = renderer.create(<ManagementCard onResetGoals={onResetGoals} onLogout={onLogout} />);
      });

      const buttons = tree!.root.findAll(
        (node: any) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function',
      );
      // Przycisk wylogowania
      act(() => {
        buttons[1].props.onPress();
      });

      expect(alertSpy).toHaveBeenCalledWith(
        pl.settings.alerts.logoutTitle,
        pl.settings.alerts.logoutMsg,
        expect.arrayContaining([
          expect.objectContaining({ text: pl.common.cancel, style: 'cancel' }),
          expect.objectContaining({ text: pl.settings.alerts.logoutConfirm, style: 'destructive' }),
        ]),
      );

      const confirmButton = alertSpy.mock.calls[0][2]?.find((b) => b.text === pl.settings.alerts.logoutConfirm);
      confirmButton?.onPress?.();
      expect(onLogout).toHaveBeenCalled();
    });
  });

  describe('SettingsScreen', () => {
    it('renderuje cele życiowe, sekcje i stopkę', () => {
      act(() => {
        useSettingsStore.setState({
          lifeGoals: ['Biegać 3 razy w tygodniu', 'Wysypiać się'],
          theme: 'AppleDark',
          aiPersonality: 'Buddha',
        });
      });

      let tree: RootRenderer;
      act(() => {
        tree = renderer.create(<SettingsScreen />);
      });

      const texts = flattenTexts(tree!.toJSON());
      expect(texts).toContain(pl.settings.barTitle);
      expect(texts).toContain(pl.settings.goalsTitle.toUpperCase());
      expect(texts).toContain('Biegać 3 razy w tygodniu');
      expect(texts).toContain('Wysypiać się');
      expect(texts).toContain(pl.settings.personalityTitle.toUpperCase());
      expect(texts).toContain(pl.settings.themeTitle.toUpperCase());
      expect(texts).toContain(pl.settings.managementTitle.toUpperCase());
      expect(texts).toContain(pl.settings.footer);
    });
  });

  describe('BadgesScreen', () => {
    it('renderuje serię, kropki tygodnia i odznaki z gabloty', () => {
      act(() => {
        useGamificationStore.setState({
          currentStreak: 4,
          unlockedBadges: ['first_step', 'streak_3'],
        });
      });

      let tree: RootRenderer;
      act(() => {
        tree = renderer.create(<BadgesScreen />);
      });

      const texts = flattenTexts(tree!.toJSON());
      expect(texts).toContain(pl.badges.barTitle);
      expect(texts).toContain(pl.badges.currentStreak.toUpperCase());
      expect(texts).toContain('4');
      expect(texts).toContain(pl.badges.unitDays(4));
      expect(texts).toContain(pl.badges.cabinet.toUpperCase());
      expect(texts).toContain('Pierwszy Krok');
      expect(texts).toContain('Trzy Dni Refleksji');
      expect(texts).toContain('Tydzień Świadomości');
      // Informacja o brakujących dniach do kolejnej odznaki (streak_7 -> 7 - 4 = 3 dni)
      expect(texts).toContain(pl.badges.nextBadge('Tydzień Świadomości', 3));
    });
  });
});
