import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NOTE_TYPE_STYLE, NoteTypeKey } from './tokens';
import { withAlpha } from './colorUtils';

/** Chip typu notatki: kolor typu z alfą ~18% w tle, ikona + etykieta w kolorze typu. */
export const NoteTypeChip: React.FC<{ type: NoteTypeKey }> = ({ type }) => {
  const style = NOTE_TYPE_STYLE[type] ?? NOTE_TYPE_STYLE.idea;
  return (
    <View style={[styles.chip, { backgroundColor: withAlpha(style.color, 0.18) }]}>
      <Feather name={style.icon} size={13} color={style.color} />
      <Text style={[styles.label, { color: style.color }]}>{style.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 9,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 12, fontWeight: '700' },
});
