import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './useTheme';
import { SHADOW } from './tokens';

interface SegmentedControlProps<K extends string> {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}

/** Przełącznik segmentowy (np. „Wpisy dnia” | „Notatki”). */
export function SegmentedControl<K extends string>({ options, value, onChange }: SegmentedControlProps<K>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.card2, borderColor: colors.border }]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.segment, on && { backgroundColor: colors.segOn, ...styles.segmentOn }]}
          >
            <Text style={[styles.label, { color: on ? colors.text : colors.textSecondary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3, gap: 3 },
  segment: { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentOn: {
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  label: { fontSize: 14, fontWeight: '600' },
});
