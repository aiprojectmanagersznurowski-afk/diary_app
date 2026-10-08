import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard, SectionLabel, useTheme } from '../ui';
import { EmotionCountPoint } from '../../../application/useCases/statsUseCase';
import { pl } from '../../i18n/pl';

interface DominantEmotionsHistogramProps {
  emotions: EmotionCountPoint[];
}

export const DominantEmotionsHistogram: React.FC<DominantEmotionsHistogramProps> = ({ emotions }) => {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <SectionLabel style={styles.title}>{pl.insights.dominantEmotions}</SectionLabel>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{pl.insights.dominantEmotionsSubtitle}</Text>

      {emotions.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{pl.insights.dominantEmotionsEmpty}</Text>
      ) : (
        <View style={styles.list}>
          {emotions.map((item, index) => {
            const barColor = colors.gradientColors[index % colors.gradientColors.length];
            const capitalized = item.emotion.charAt(0).toUpperCase() + item.emotion.slice(1);

            return (
              <View key={`${item.emotion}-${index}`} style={styles.emotionRow}>
                <View style={styles.labelRow}>
                  <Text style={[styles.emotionName, { color: colors.text }]}>{capitalized}</Text>
                  <Text style={[styles.emotionStats, { color: colors.textSecondary }]}>
                    {`${item.count} ${pl.insights.occurrences} (${item.percentage}%)`}
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: colors.track }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.max(item.percentage, 6)}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  list: {
    gap: 14,
  },
  emotionRow: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emotionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  emotionStats: {
    fontSize: 12,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
