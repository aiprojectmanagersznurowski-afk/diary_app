import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard, SectionLabel, useTheme } from '../ui';
import { pl } from '../../i18n/pl';
import { LineChartPoint } from '../../../application/useCases/statsUseCase';

interface EnergyBarChartProps {
  energy: LineChartPoint[];
  energyNote: string;
}

const BAR_CONTAINER_HEIGHT = 80;

export const EnergyBarChart: React.FC<EnergyBarChartProps> = ({ energy, energyNote }) => {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <SectionLabel style={styles.title}>{pl.insights.energy}</SectionLabel>
        <Text style={[styles.note, { color: colors.textSecondary }]}>{energyNote}</Text>
      </View>

      <View style={styles.barsContainer}>
        {energy.map((point, index) => {
          const clamped = Math.max(8, Math.min(100, point.value));
          return (
            <View key={`${point.label}-${index}`} style={styles.barCol}>
              <View style={styles.barTrack}>
                <LinearGradient
                  colors={colors.gradientColors}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 0, y: 0 }}
                  style={[styles.bar, { height: `${clamped}%` }]}
                />
              </View>
              {point.label ? (
                <Text style={[styles.barLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                  {point.label}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    margin: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
  },
  note: {
    fontSize: 12,
    fontWeight: '600',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_CONTAINER_HEIGHT + 20,
    gap: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    maxWidth: 24,
    height: BAR_CONTAINER_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
});
