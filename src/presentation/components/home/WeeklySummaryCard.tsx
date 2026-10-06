import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { GlassCard, SectionLabel, useTheme } from '../ui';
import { pl } from '../../i18n/pl';
import { alignmentMessage, ringDash } from './homeLogic';

const SIZE = 88;
const STROKE = 9;
const RADIUS = 36;

interface WeeklySummaryCardProps {
  /** Zgodność z celami życiowymi (0–100) z wpisów dnia z ostatnich 7 dni. */
  percent: number;
  onPress: () => void;
}

/** Karta „Podsumowanie tygodnia”: pierścień zgodności z celami, komunikat i link do Analiz. */
export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({ percent, onPress }) => {
  const { colors } = useTheme();
  const { dash } = ringDash(percent, RADIUS);
  const [g1, g2, g3] = colors.gradientColors;
  return (
    <GlassCard onPress={onPress} style={styles.card} accessibilityLabel={pl.home.weekLabel}>
      <SectionLabel style={styles.label}>{pl.home.weekLabel}</SectionLabel>
      <View style={styles.row}>
        <View style={styles.ring}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={styles.svg}>
            <Defs>
              <LinearGradient id="homeRing" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={g1} />
                <Stop offset="0.5" stopColor={g2} />
                <Stop offset="1" stopColor={g3 ?? g2} />
              </LinearGradient>
            </Defs>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={colors.track} strokeWidth={STROKE} />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="url(#homeRing)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={dash}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.percent, { color: colors.text }]}>{percent}%</Text>
          </View>
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: colors.text }]}>{pl.home.alignmentTitle}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{alignmentMessage(percent)}</Text>
        </View>
      </View>
      <Text style={[styles.link, { color: colors.primary }]}>{pl.home.weekLink}</Text>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: { marginTop: 18 },
  label: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring: { width: SIZE, height: SIZE },
  svg: { transform: [{ rotate: '-90deg' }] },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  texts: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5, lineHeight: 22 },
  message: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  link: { fontSize: 14, fontWeight: '700', marginTop: 12 },
});
