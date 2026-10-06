import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PILL_TEXT, resolveEmotion } from './tokens';

/** Pigułka emocji: tło w kolorze emocji, ciemny tekst (docs/08-design-ui.md §1.2). */
export const EmotionPill: React.FC<{ id: string; trigger?: string }> = ({ id, trigger }) => {
  const emotion = resolveEmotion(id);
  return (
    <View style={[styles.pill, { backgroundColor: emotion.color }]}>
      <Text style={styles.text}>
        {id}
        {trigger ? `: ${trigger}` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '700', color: PILL_TEXT },
});
