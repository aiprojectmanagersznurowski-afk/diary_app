import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from './useTheme';
import { SHADOW } from './tokens';

interface GlassCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Siła rozmycia tła (expo-blur). */
  intensity?: number;
  /** Wewnętrzny odstęp treści (domyślnie 16 wg briefu). */
  padding?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** Szklana karta: rozmycie + obramowanie 1 px + promień 22 + cień (docs/08-design-ui.md §1.3). */
export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 24,
  padding = 16,
  onPress,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();
  const body = (
    <>
      <BlurView intensity={intensity} style={StyleSheet.absoluteFill} tint={colors.isLight ? 'light' : 'dark'} />
      <View style={{ padding }}>{children}</View>
    </>
  );
  const wrapperStyle = [styles.wrapper, { borderColor: colors.border, backgroundColor: colors.card }, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [...wrapperStyle, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }
  return <View style={wrapperStyle}>{body}</View>;
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  pressed: { transform: [{ scale: 0.985 }] },
});
