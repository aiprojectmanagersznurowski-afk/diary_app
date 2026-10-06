import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from './useTheme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface ChipProps {
  label: string;
  /** Aktywny chip (filtr): tło primary, tekst onPrimary. */
  selected?: boolean;
  onPress?: () => void;
  icon?: FeatherName;
  /** Kolorowa kropka przed etykietą. */
  dotColor?: string;
}

/** Chip: promień 12, tło card2, obramowanie border (docs/08-design-ui.md §1.3). */
export const Chip: React.FC<ChipProps> = ({ label, selected, onPress, icon, dotColor }) => {
  const { colors } = useTheme();
  const textColor = selected ? colors.onPrimary : colors.text;
  const content = (
    <>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      {icon ? <Feather name={icon} size={14} color={textColor} /> : null}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </>
  );
  const style = [
    styles.chip,
    selected
      ? { backgroundColor: colors.primary, borderColor: 'transparent' }
      : { backgroundColor: colors.card2, borderColor: colors.border },
  ];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={style}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 11,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '600' },
});
