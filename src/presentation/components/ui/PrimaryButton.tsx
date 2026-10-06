import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from './useTheme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/** Główny przycisk: wysokość 54, promień 16, tło primary, tekst onPrimary. */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ label, onPress, loading, disabled }) => {
  const { colors } = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary },
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <Text style={[styles.label, { color: colors.onPrimary }]}>{label}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  label: { fontSize: 17, fontWeight: '700' },
  inactive: { opacity: 0.6 },
  pressed: { transform: [{ scale: 0.985 }] },
});
