import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { ErrorBoundary } from '../ErrorBoundary';
import { ConfigErrorScreen, ConfigGate } from '../../screens/ConfigErrorScreen';
import { pl } from '../../i18n/pl';

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

function render(element: React.ReactElement): any {
  let tree: any;
  act(() => {
    tree = renderer.create(element);
  });
  mounted.push(tree);
  return tree;
}

const textOf = (node: any) => ([] as unknown[]).concat(node.props.children).join('');
const texts = (tree: any): string[] => tree.root.findAllByType('Text' as never).map(textOf);

afterEach(() => {
  while (mounted.length) {
    const tree = mounted.pop();
    act(() => tree.unmount());
  }
});

describe('ConfigErrorScreen i ConfigGate', () => {
  const issues = [
    { variable: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', message: 'wartość to tekst zastępczy (<ano…)' },
    {
      variable: 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
      message: 'brak wartości (zmienna nie została ustawiona w buildzie)',
    },
  ];

  it('ekran błędu pokazuje tytuł, wyjaśnienie i listę problemów', () => {
    const tree = render(<ConfigErrorScreen issues={issues} />);
    const t = texts(tree);
    expect(t).toContain(pl.errors.configTitle);
    expect(t).toContain(pl.errors.configIntro);
    expect(t).toContain(pl.errors.configHint);
    for (const issue of issues) {
      expect(t).toContain(issue.variable);
      expect(t).toContain(issue.message);
    }
  });

  it('bramka przy błędnej konfiguracji pokazuje ekran błędu i NIE renderuje aplikacji', () => {
    const appMounted = jest.fn();
    const App = () => {
      appMounted();
      return <Text>APLIKACJA</Text>;
    };
    const tree = render(
      <ConfigGate result={{ config: null, issues }}>
        <App />
      </ConfigGate>,
    );
    expect(texts(tree)).toContain(pl.errors.configTitle);
    expect(texts(tree)).not.toContain('APLIKACJA');
    expect(appMounted).not.toHaveBeenCalled();
  });

  it('bramka przy poprawnej konfiguracji renderuje aplikację', () => {
    const tree = render(
      <ConfigGate result={{ config: { ok: true }, issues: [] }}>
        <Text>APLIKACJA</Text>
      </ConfigGate>,
    );
    expect(texts(tree)).toEqual(['APLIKACJA']);
  });
});

describe('ErrorBoundary', () => {
  let shouldThrow = true;
  const Bomb = () => {
    if (shouldThrow) throw new Error('wyjątek w renderze');
    return <Text>DZIAŁA</Text>;
  };

  beforeEach(() => {
    shouldThrow = true;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('pokazuje komunikat po polsku zamiast białego ekranu i zgłasza błąd', () => {
    const onError = jest.fn();
    const tree = render(
      <ErrorBoundary onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );
    const t = texts(tree);
    expect(t).toContain(pl.errors.boundaryTitle);
    expect(t).toContain(pl.errors.boundaryBody);
    expect(t).toContain(pl.errors.retry);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe('wyjątek w renderze');
  });

  it('„Spróbuj ponownie” odtwarza dzieci po naprawieniu przyczyny', () => {
    const tree = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(texts(tree)).not.toContain('DZIAŁA');

    shouldThrow = false;
    const retry = tree.root.find(
      (n: any) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function',
    );
    act(() => {
      retry.props.onPress();
    });
    expect(texts(tree)).toEqual(['DZIAŁA']);
  });

  it('bez błędu renderuje dzieci bez zmian', () => {
    shouldThrow = false;
    const tree = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(texts(tree)).toEqual(['DZIAŁA']);
  });
});
