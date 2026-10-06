import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { RecordingStage, STATUS_STYLE, STATUS_TEXT } from './tokens';

interface StatusChipProps {
  stage: RecordingStage;
  label: string;
}

/** Chip statusu nagrania; w toku pulsuje (opacity 1 ↔ .45, 1,2 s). */
export const StatusChip: React.FC<StatusChipProps> = ({ stage, label }) => {
  const { color, pulse } = STATUS_STYLE[stage];
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, opacity]);

  return (
    <Animated.View style={[styles.chip, { backgroundColor: color, opacity }]}>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  chip: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 9, alignSelf: 'flex-start' },
  label: { fontSize: 11.5, fontWeight: '700', color: STATUS_TEXT },
});
