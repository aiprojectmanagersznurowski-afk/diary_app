import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { THEMES, ThemeName } from '../../../application/store/useSettingsStore';
import { useTheme } from '../ui';
import { pl } from '../../i18n/pl';

interface ThemeOption {
  key: ThemeName;
  label: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { key: 'AppleDark', label: pl.settings.themes.dark },
  { key: 'AppleLight', label: pl.settings.themes.light },
  { key: 'Sepia', label: pl.settings.themes.sepia },
];

interface ThemeSelectorProps {
  selected: ThemeName;
  onSelect: (theme: ThemeName) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ selected, onSelect }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.grid}>
      {THEME_OPTIONS.map((opt) => {
        const isSelected = opt.key === selected;
        const optTheme = THEMES[opt.key];

        return (
          <Pressable
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.button,
              {
                backgroundColor: colors.card2,
                borderColor: isSelected ? colors.primary : colors.border,
                borderWidth: isSelected ? 2 : 1,
              },
            ]}
          >
            {/* Próbnik dwukolorowy */}
            <View
              style={[
                styles.swatchOuter,
                {
                  backgroundColor: optTheme.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.swatchCorner,
                  {
                    backgroundColor: optTheme.primary,
                  },
                ]}
              />
            </View>

            {/* Etykieta */}
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? colors.text : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '600',
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
  },
  swatchOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
  },
  swatchCorner: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderTopLeftRadius: 22,
  },
  label: {
    fontSize: 14,
  },
});
