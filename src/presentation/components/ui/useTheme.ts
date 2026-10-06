import { useSettingsStore, THEMES, ThemeColors, ThemeName } from '../../../application/store/useSettingsStore';

export interface UseTheme {
  name: ThemeName;
  colors: ThemeColors;
}

/** Jedyne źródło kolorów motywu dla komponentów; zmiana motywu w store przemalowuje wszystko od razu. */
export function useTheme(): UseTheme {
  const name = useSettingsStore((s) => s.theme);
  return { name, colors: THEMES[name] };
}
