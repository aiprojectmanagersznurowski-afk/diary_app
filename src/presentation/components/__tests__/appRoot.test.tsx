import React from 'react';
import renderer, { act } from 'react-test-renderer';
import App from '../../../../App';
import { pl } from '../../i18n/pl';

/**
 * Prawdziwa biblioteka rzuca „No safe area value available”, gdy hook jest użyty poza SafeAreaProvider.
 * Mock odtwarza to zachowanie, żeby test wykrył brak providera w korzeniu (a nie go maskował).
 */
jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactLib = require('react');
  const Context = ReactLib.createContext(null);
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      ReactLib.createElement(Context.Provider, { value: { top: 0, bottom: 0, left: 0, right: 0 } }, children),
    useSafeAreaInsets: () => {
      const value = ReactLib.useContext(Context);
      if (!value)
        throw new Error(
          'No safe area value available. Make sure you are rendering `<SafeAreaProvider>` at the top of your app.',
        );
      return value;
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(null),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
    clear: jest.fn().mockResolvedValue(null),
    getAllKeys: jest.fn().mockResolvedValue([]),
    multiGet: jest.fn().mockResolvedValue([]),
    multiSet: jest.fn().mockResolvedValue(null),
    multiRemove: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock('expo-audio', () => ({ AudioModule: {}, RecordingPresets: {}, requestRecordingPermissionsAsync: jest.fn() }));
jest.mock('../../../infrastructure/queue/queueListener', () => ({ setupQueueListener: jest.fn(() => jest.fn()) }));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn() },
}));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { WHITE: 0, WHITE_OUTLINE: 1 },
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  signInAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'uuid',
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
}));
jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-status-bar', () => ({ StatusBar: 'StatusBar' }));
jest.mock('@react-native-masked-view/masked-view', () => 'MaskedView');
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather', Ionicons: 'Ionicons' }));
jest.mock('react-native-gifted-charts', () => ({ LineChart: 'LineChart', BarChart: 'BarChart' }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

const textOf = (node: any) => ([] as unknown[]).concat(node.props.children).join('');

describe('korzeń aplikacji przy błędnej konfiguracji (w testach nie ma zmiennych EXPO_PUBLIC_*)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pokazuje ekran „Błąd konfiguracji” z listą zmiennych, a nie ogólny komunikat ErrorBoundary', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<App />);
    });
    const texts: string[] = tree.root.findAllByType('Text' as never).map(textOf);

    expect(texts).toContain(pl.errors.configTitle);
    expect(texts).not.toContain(pl.errors.boundaryTitle);
    expect(texts).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(texts).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(texts).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
    expect(texts).toContain('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');

    act(() => tree.unmount());
  });

  it('nie uruchamia logowania ani nawigacji (AppContent nie jest montowany)', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<App />);
    });
    const texts: string[] = tree.root.findAllByType('Text' as never).map(textOf);
    expect(texts).not.toContain(pl.login.google);
    expect(texts).not.toContain(pl.login.title);
    act(() => tree.unmount());
  });
});
