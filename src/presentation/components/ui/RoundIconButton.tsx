import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useTheme } from './useTheme';
import { ACCENTS } from './tokens';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface RoundIconButtonProps {
  icon: FeatherName;
  onPress: () => void;
  accessibilityLabel: string;
  /** Kolor ikony; domyślnie kolor tekstu motywu. */
  iconColor?: string;
  /** Plakietka: `true` = kropka primary, liczba = licznik, `error` = czerwona kropka. */
  badge?: boolean | number | 'error';
  size?: number;
}

/** Okrągły szklany przycisk nagłówka (40 px; pole dotyku powiększone do 44 pt przez hitSlop). */
export const RoundIconButton: React.FC<RoundIconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  iconColor,
  badge,
  size = 40,
}) => {
  const { colors } = useTheme();
  const slop = Math.max(0, Math.ceil((44 - size) / 2));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2, borderColor: colors.border, backgroundColor: colors.card },
        pressed && styles.pressed,
      ]}
    >
      <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={colors.isLight ? 'light' : 'dark'} />
      <Feather name={icon} size={18} color={iconColor ?? colors.text} />
      {badge ? (
        typeof badge === 'number' ? (
          <View style={[styles.count, { backgroundColor: colors.primary }]}>
            <Text style={[styles.countText, { color: colors.onPrimary }]}>{badge}</Text>
          </View>
        ) : (
          <View style={[styles.dot, { backgroundColor: badge === 'error' ? ACCENTS.error : colors.primary }]} />
        )
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  pressed: { transform: [{ scale: 0.94 }] },
  dot: { position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4 },
  count: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 10, fontWeight: '800' },
});
