import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { GlassCard, SectionLabel, useTheme } from '../ui';
import { pl } from '../../i18n/pl';
import { calculateRingProgress } from './chartLogic';

interface GoalAlignmentRingProps {
  percentage: number;
  message: string;
}

const RING_SIZE = 124;
const STROKE_WIDTH = 12;
const RADIUS = 50; // (124 - 12 - 12) / 2 = 50, center = 62

export const GoalAlignmentRing: React.FC<GoalAlignmentRingProps> = ({ percentage, message }) => {
  const { colors } = useTheme();
  const { circumference, strokeDashoffset } = calculateRingProgress(RADIUS, percentage);

  return (
    <GlassCard style={styles.card}>
      <SectionLabel style={styles.title}>{pl.insights.goalAlignment}</SectionLabel>

      <View style={styles.contentRow}>
        <View style={styles.ringWrapper}>
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            <Defs>
              <SvgLinearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={colors.gradientColors[0]} />
                <Stop offset="0.5" stopColor={colors.gradientColors[1]} />
                <Stop offset="1" stopColor={colors.gradientColors[2] || colors.gradientColors[1]} />
              </SvgLinearGradient>
            </Defs>

            {/* Okrąg tła */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={colors.track}
              strokeWidth={STROKE_WIDTH}
            />

            {/* Postęp */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="url(#ringG)"
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>

          <View style={styles.centerTextContainer}>
            <Text style={[styles.percentageText, { color: colors.text }]}>{`${percentage}%`}</Text>
            <Text style={[styles.subText, { color: colors.textSecondary }]}>{pl.insights.alignmentWord}</Text>
          </View>
        </View>

        <View style={styles.messageContainer}>
          <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
  },
  title: {
    margin: 0,
    marginTop: 0,
    marginBottom: 14,
    marginLeft: 0,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTextContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
