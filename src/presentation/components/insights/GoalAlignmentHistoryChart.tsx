import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard, SectionLabel, useTheme } from '../ui';
import { GoalDayPoint } from '../../../application/useCases/statsUseCase';
import { pl } from '../../i18n/pl';

interface GoalAlignmentHistoryChartProps {
  history: GoalDayPoint[];
  timeRange: '7d' | '30d';
}

const BAR_CONTAINER_HEIGHT = 80;

export const GoalAlignmentHistoryChart: React.FC<GoalAlignmentHistoryChartProps> = ({ history, timeRange }) => {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <SectionLabel style={styles.title}>{pl.insights.goalHistory}</SectionLabel>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{pl.insights.goalHistorySubtitle}</Text>

      <View style={styles.chartArea}>
        <View style={styles.barsRow}>
          {history.map((point, index) => {
            const is7d = timeRange === '7d';
            const isPositive = point.status === 'positive';
            const isNeutral = point.status === 'neutral';
            const isNegative = point.status === 'negative';
            const isEmpty = point.status === 'empty';

            let barHeight = 8;
            let barColor = colors.track;

            if (isPositive) {
              barHeight = BAR_CONTAINER_HEIGHT;
              barColor = colors.gradientColors[0];
            } else if (isNeutral) {
              barHeight = Math.round(BAR_CONTAINER_HEIGHT * 0.5);
              barColor = colors.gradientColors[1];
            } else if (isNegative) {
              barHeight = Math.round(BAR_CONTAINER_HEIGHT * 0.2);
              barColor = colors.textSecondary;
            }

            return (
              <View
                key={`${point.day}-${index}`}
                style={[styles.columnWrapper, is7d ? styles.column7d : styles.column30d]}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: barHeight,
                        backgroundColor: barColor,
                        opacity: isEmpty ? 0.35 : 1,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.dayLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {point.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.gradientColors[0] }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{pl.insights.positiveImpact}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.gradientColors[1] }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{pl.insights.neutralImpact}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.track }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{pl.insights.emptyDay}</Text>
        </View>
      </View>
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
    marginBottom: 18,
  },
  chartArea: {
    height: BAR_CONTAINER_HEIGHT + 28,
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_CONTAINER_HEIGHT,
  },
  columnWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: BAR_CONTAINER_HEIGHT + 24,
  },
  column7d: {
    flex: 1,
    paddingHorizontal: 4,
  },
  column30d: {
    flex: 1,
    paddingHorizontal: 1,
  },
  barTrack: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: BAR_CONTAINER_HEIGHT,
  },
  barFill: {
    width: '100%',
    maxWidth: 22,
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 11,
    marginTop: 6,
    height: 16,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
    paddingTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
});
