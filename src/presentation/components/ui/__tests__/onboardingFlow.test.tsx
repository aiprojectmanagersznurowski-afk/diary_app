import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useSettingsStore } from '../../../../application/store/useSettingsStore';
import { useAuthStore } from '../../../../application/store/useAuthStore';
import { OnboardingScreen } from '../../../screens/OnboardingScreen';
import { pl } from '../../../i18n/pl';

const mockServices = {
  audioRecorder: {
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    getCurrentMetering: jest.fn(),
    getRecordingDuration: jest.fn(),
  },
  aiService: {
    transcribe: jest.fn(),
    extractData: jest.fn(),
    extractLifeGoalsFromTranscript: jest.fn(),
  },
  profileService: {
    getProfile: jest.fn(),
    saveProfile: jest.fn(),
    completeOnboarding: jest.fn(),
  },
};

jest.mock('../../../../composition/context', () => ({
  useOnboardingServices: () => mockServices,
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

const mounted: any[] = [];

function render(): any {
  let tree: any;
  act(() => {
    tree = renderer.create(<OnboardingScreen />);
  });
  mounted.push(tree);
  return tree;
}

afterEach(() => {
  // Odmontowanie zatrzymuje animacje i interwały, żeby proces Jest mógł się zakończyć.
  while (mounted.length) {
    const tree = mounted.pop();
    act(() => tree.unmount());
  }
});

function texts(tree: any): string[] {
  return tree.root.findAllByType('Text' as never).map((t: any) => ([] as unknown[]).concat(t.props.children).join(''));
}

async function press(tree: any, label: string) {
  const target = tree.root.find(
    (n: any) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
  await act(async () => {
    await target.props.onPress();
  });
}

async function pressText(tree: any, text: string) {
  const target = tree.root.find(
    (n: any) =>
      n.props.accessibilityRole === 'button' &&
      typeof n.props.onPress === 'function' &&
      n.findAllByType('Text' as never).some((t: any) => ([] as unknown[]).concat(t.props.children).join('') === text),
  );
  await act(async () => {
    await target.props.onPress();
  });
}

describe('OnboardingScreen: przepływ z briefu §2.2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServices.audioRecorder.startRecording.mockResolvedValue(undefined);
    mockServices.audioRecorder.stopRecording.mockResolvedValue('file://answer.m4a');
    mockServices.aiService.transcribe.mockResolvedValueOnce('Chcę biegać').mockResolvedValueOnce('Chcę awansu');
    mockServices.aiService.extractLifeGoalsFromTranscript.mockResolvedValue(['Biegać 3 razy w tygodniu', 'Awansować']);
    mockServices.profileService.completeOnboarding.mockResolvedValue(undefined);
    act(() => {
      useSettingsStore.setState({ lifeGoals: [], theme: 'AppleDark', aiPersonality: 'Po prostu przyjaciel' });
      useAuthStore.getState().setUser({ id: 'user-1', email: 'a@b.pl', name: null, avatarUrl: null });
    });
  });

  it('pokazuje powitanie, 2 kroki i pierwsze pytanie z briefu', () => {
    const tree = render();
    const t = texts(tree);
    expect(t).toContain(pl.onboarding.hello);
    expect(t).toContain(pl.onboarding.subtitle(2));
    expect(t).toContain(pl.onboarding.stepLabel(1, 2));
    expect(t).toContain(pl.onboarding.questions[0]);
    expect(t).toContain(pl.onboarding.tapToRecord);
    expect(t).toContain(pl.onboarding.skip);
  });

  it('nagranie → kolejne pytanie → cele → „Zaczynamy” zapisuje profil i ustawia cele', async () => {
    const tree = render();

    await press(tree, 'Nagraj');
    expect(mockServices.audioRecorder.startRecording).toHaveBeenCalledTimes(1);
    expect(texts(tree)).toContain(pl.onboarding.tapToStop);

    await press(tree, 'Zatrzymaj nagrywanie');
    expect(mockServices.aiService.transcribe).toHaveBeenCalledWith('file://answer.m4a');
    expect(texts(tree)).toContain(pl.onboarding.stepLabel(2, 2));
    expect(texts(tree)).toContain(pl.onboarding.questions[1]);

    await press(tree, 'Nagraj');
    await press(tree, 'Zatrzymaj nagrywanie');
    expect(mockServices.aiService.extractLifeGoalsFromTranscript).toHaveBeenCalledWith('Chcę biegać\n\nChcę awansu');

    const t = texts(tree);
    expect(t).toContain(pl.onboarding.goalsSet);
    expect(t).toContain(pl.onboarding.goalsSetSubtitle);
    expect(t).toContain('Biegać 3 razy w tygodniu');
    expect(t).not.toContain(pl.onboarding.skip);
    expect(useSettingsStore.getState().lifeGoals).toEqual([]);

    await pressText(tree, pl.onboarding.start);

    expect(mockServices.profileService.completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', lifeGoals: ['Biegać 3 razy w tygodniu', 'Awansować'] }),
    );
    expect(useSettingsStore.getState().lifeGoals).toEqual(['Biegać 3 razy w tygodniu', 'Awansować']);
  });

  it('„Pomiń” zapisuje domyślny cel z briefu', async () => {
    const tree = render();
    await pressText(tree, pl.onboarding.skip);

    expect(mockServices.profileService.completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ lifeGoals: [pl.onboarding.defaultGoal] }),
    );
    expect(useSettingsStore.getState().lifeGoals).toEqual([pl.onboarding.defaultGoal]);
  });

  it('błąd rozpoznawania mowy pokazuje komunikat i zostaje na tym samym kroku', async () => {
    mockServices.aiService.transcribe.mockReset();
    mockServices.aiService.transcribe.mockResolvedValue('   ');
    const tree = render();

    await press(tree, 'Nagraj');
    await press(tree, 'Zatrzymaj nagrywanie');

    expect(texts(tree).some((x) => x.includes(pl.onboarding.errorNoSpeech))).toBe(true);
    expect(texts(tree)).toContain(pl.onboarding.stepLabel(1, 2));
    expect(mockServices.profileService.completeOnboarding).not.toHaveBeenCalled();
  });
});
