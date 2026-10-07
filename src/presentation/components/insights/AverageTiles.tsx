import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ACCENTS, GlassCard, GradientText, useTheme } from '../ui';
import { pl } from '../../i18n/pl';

interface AverageTilesProps {
  avgStress: number;
  avgCalm: number;
  avgEnergy: number;
}

export const AverageTiles: React.FC<AverageTilesProps> = ({ avgStress, avgCalm, avgEnergy }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <GlassCard padding={14} style={styles.tile}>
        <Text style={[styles.value, { color: ACCENTS.error }]}>{`${avgStress}%`}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{pl.insights.avgStress}</Text>
      </GlassCard>

      <GlassCard padding={14} style={styles.tile}>
        <Text style={[styles.value, { color: ACCENTS.sky }]}>{`${avgCalm}%`}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{pl.insights.avgCalm}</Text>
      </GlassCard>

      <GlassCard padding={14} style={styles.tile}>
        <GradientText text={`${avgEnergy}%`} style={styles.value} />
        <Text style={[styles.label, { color: colors.textSecondary }]}>{pl.insights.avgEnergy}</Text>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
