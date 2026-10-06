import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { useTheme } from './useTheme';

/** Etykieta sekcji: UPPERCASE 12 px, waga 700, letter-spacing 1.5, kolor drugorzędny. */
export const SectionLabel: React.FC<{ children: string; style?: StyleProp<TextStyle> }> = ({ children, style }) => {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.textSecondary }, style]}>{children.toUpperCase()}</Text>;
};

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
});
