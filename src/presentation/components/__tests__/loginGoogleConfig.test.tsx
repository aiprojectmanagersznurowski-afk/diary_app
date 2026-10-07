import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { LoginScreen } from '../../screens/LoginScreen';

const mockConfigure = jest.fn();
const mockHasPlayServices = jest.fn().mockResolvedValue(true);
const mockSignIn = jest.fn();
const mockAppConfig: { current: { config: unknown; issues: unknown[] } } = { current: { config: null, issues: [] } };

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (...args: unknown[]) => mockConfigure(...args),
    hasPlayServices: (...args: unknown[]) => mockHasPlayServices(...args),
    signIn: (...args: unknown[]) => mockSignIn(...args),
  },
}));
jest.mock('../../../composition', () => ({
  get appConfigResult() {
    return mockAppConfig.current;
  },
  useAuthService: () => ({ signInWithGoogle: jest.fn(), signInWithApple: jest.fn() }),
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

// Liczba wywołań GoogleSignin.configure zaraz po załadowaniu modułu LoginScreen (przed jakimkolwiek testem).
const configureCallsAtImport = mockConfigure.mock.calls.length;

const GOOGLE = {
  googleWebClientId: '123456789012-webclientid.apps.googleusercontent.com',
  googleIosClientId: '123456789012-iosclientid.apps.googleusercontent.com',
};

const mounted: any[] = [];

function render(element: React.ReactElement): any {
  let tree: any;
  act(() => {
    tree = renderer.create(element);
  });
  mounted.push(tree);
  return tree;
}

const textOf = (node: any) => ([] as unknown[]).concat(node.props.children).join('');

async function pressGoogle(tree: any) {
  const button = tree.root.find(
    (n: any) =>
      n.props.accessibilityRole === 'button' &&
      typeof n.props.onPress === 'function' &&
      n.findAllByType('Text' as never).some((t: any) => textOf(t) === 'Zaloguj z Google'),
  );
  await act(async () => {
    await button.props.onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHasPlayServices.mockResolvedValue(true);
});

afterEach(() => {
  while (mounted.length) {
    const tree = mounted.pop();
    act(() => tree.unmount());
  }
});

// Testy zależą od kolejności: LoginScreen pamięta, że SDK został już skonfigurowany (najpierw błędna, potem poprawna).
describe('LoginScreen: konfiguracja Google (docs/09-audyt-gotowosci.md, ustalenie 3)', () => {
  it('samo załadowanie modułu nie woła GoogleSignin.configure (nawet przy poprawnej konfiguracji)', () => {
    expect(configureCallsAtImport).toBe(0);
  });

  it('przy błędnej konfiguracji nie konfiguruje SDK i nie próbuje logować, tylko pokazuje błąd', async () => {
    mockAppConfig.current = { config: null, issues: [{ variable: 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', message: 'x' }] };
    const tree = render(<LoginScreen />);
    await pressGoogle(tree);

    expect(mockConfigure).not.toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();
    expect(tree.root.findAllByType('Text' as never).map(textOf)).toContain('Błąd podczas logowania przez Google.');
  });

  it('przy poprawnej konfiguracji konfiguruje SDK identyfikatorami z konfiguracji (raz) i loguje', async () => {
    mockAppConfig.current = { config: { ...GOOGLE }, issues: [] };
    mockSignIn.mockResolvedValue({ type: 'cancelled' });
    const tree = render(<LoginScreen />);

    await pressGoogle(tree);
    await pressGoogle(tree);

    expect(mockConfigure).toHaveBeenCalledTimes(1);
    expect(mockConfigure).toHaveBeenCalledWith({
      webClientId: GOOGLE.googleWebClientId,
      iosClientId: GOOGLE.googleIosClientId,
    });
    expect(mockSignIn).toHaveBeenCalledTimes(2);
  });
});
