import { THEMES, ThemeColors, ThemeName } from '../useSettingsStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn().mockResolvedValue(null),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(null),
  },
}));

const NAMES: ThemeName[] = ['AppleDark', 'AppleLight', 'Sepia'];

const REQUIRED_KEYS: (keyof ThemeColors)[] = [
  'background',
  'text',
  'textSecondary',
  'primary',
  'border',
  'card',
  'card2',
  'segOn',
  'track',
  'sheet',
  'veil',
  'onPrimary',
  'link',
  'gradientColors',
  'aurora',
  'isLight',
];

describe('THEMES: tokeny z docs/08-design-ui.md §1', () => {
  it.each(NAMES)('motyw %s zawiera komplet tokenów', (name) => {
    const theme = THEMES[name];
    for (const key of REQUIRED_KEYS) {
      expect(theme[key]).toBeDefined();
    }
    expect(theme.gradientColors).toHaveLength(3);
    expect(theme.aurora).toHaveLength(3);
  });

  it('wartości bazowe zgadzają się z tabelą briefu (Dark)', () => {
    expect(THEMES.AppleDark).toMatchObject({
      background: '#000000',
      text: '#E2E8F0',
      textSecondary: '#94A3B8',
      primary: '#A78BFA',
      border: 'rgba(255,255,255,0.10)',
      card: 'rgba(255,255,255,0.06)',
      card2: 'rgba(255,255,255,0.08)',
      track: 'rgba(255,255,255,0.10)',
      sheet: 'rgba(24,24,28,0.94)',
      onPrimary: '#0B0B12',
      gradientColors: ['#A78BFA', '#F472B6', '#38BDF8'],
    });
  });

  it('wartości bazowe zgadzają się z tabelą briefu (Light)', () => {
    expect(THEMES.AppleLight).toMatchObject({
      background: '#FFFFFF',
      text: '#1C1C1E',
      textSecondary: '#8E8E93',
      primary: '#007AFF',
      card: 'rgba(255,255,255,0.82)',
      card2: 'rgba(0,0,0,0.04)',
      track: 'rgba(0,0,0,0.07)',
      sheet: 'rgba(255,255,255,0.97)',
      onPrimary: '#FFFFFF',
      gradientColors: ['#007AFF', '#5856D6', '#FF2D55'],
    });
  });

  it('wartości bazowe zgadzają się z tabelą briefu (Sepia)', () => {
    expect(THEMES.Sepia).toMatchObject({
      background: '#F4ECD8',
      text: '#4A3B32',
      textSecondary: '#7A6B62',
      primary: '#D97757',
      card: 'rgba(255,255,255,0.42)',
      card2: 'rgba(74,59,50,0.06)',
      track: 'rgba(74,59,50,0.09)',
      sheet: 'rgba(250,244,230,0.97)',
      onPrimary: '#FFFFFF',
      gradientColors: ['#D97757', '#C48A71', '#8C5A46'],
    });
  });

  it('motywy jasne mają isLight = true, ciemny false; dotychczasowe klucze zostały', () => {
    expect(THEMES.AppleDark.isLight).toBe(false);
    expect(THEMES.AppleLight.isLight).toBe(true);
    expect(THEMES.Sepia.isLight).toBe(true);
    for (const name of NAMES) {
      expect(THEMES[name].tileBorder).toBe(THEMES[name].border.replace('0.10', '0.1'));
    }
  });
});
