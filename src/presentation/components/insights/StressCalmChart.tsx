import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import { ACCENTS, GlassCard, SectionLabel, useTheme } from '../ui';
import { pl } from '../../i18n/pl';
import { LineChartPoint } from '../../../application/useCases/statsUseCase';
import { buildChartPoints, smoothAreaPath, smoothLinePath } from './chartLogic';

interface StressCalmChartProps {
  stress: LineChartPoint[];
  calm: LineChartPoint[];
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 140;

export const StressCalmChart: React.FC<StressCalmChartProps> = ({ stress, calm }) => {
  const { colors } = useTheme();

  const stressValues = stress.map((p) => p.value);
  const calmValues = calm.map((p) => p.value);

  const stressPoints = buildChartPoints(stressValues, CHART_WIDTH, CHART_HEIGHT, {
    top: 14,
    bottom: 14,
    left: 8,
    right: 8,
  });
  const calmPoints = buildChartPoints(calmValues, CHART_WIDTH, CHART_HEIGHT, {
    top: 14,
    bottom: 14,
    left: 8,
    right: 8,
  });

  const stressPath = smoothLinePath(stressPoints);
  const calmPath = smoothLinePath(calmPoints);
  const calmArea = smoothAreaPath(calmPoints, CHART_HEIGHT);

  const lastStress = stressPoints.length > 0 ? stressPoints[stressPoints.length - 1] : null;
  const lastCalm = calmPoints.length > 0 ? calmPoints[calmPoints.length - 1] : null;

  // Filtrujemy etykiety osi X (np. dla 7 dni wszystkie, dla 30 dni tylko co kilka)
  const labels = stress.filter((p) => !!p.label);

  return (
    <GlassCard>
      <View style={styles.header}>
        <SectionLabel style={styles.title}>{pl.insights.stressVsCalm}</SectionLabel>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: ACCENTS.error }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{pl.insights.stress}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: ACCENTS.sky }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{pl.insights.calm}</Text>
          </View>
        </View>
      </View>

      <View style={styles.svgWrapper}>
        <Svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
        >
          <Defs>
            <SvgLinearGradient id="calmFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={ACCENTS.sky} stopOpacity="0.32" />
              <Stop offset="1" stopColor={ACCENTS.sky} stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>

          {/* Linie siatki */}
          <Path
            d={`M 0 14 H ${CHART_WIDTH} M 0 70 H ${CHART_WIDTH} M 0 126 H ${CHART_WIDTH}`}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="4,4"
          />

          {/* Wypełnienie pod Spokojem */}
          {calmArea ? <Path d={calmArea} fill="url(#calmFill)" /> : null}

          {/* Krzywa Spokój */}
          {calmPath ? <Path d={calmPath} stroke={ACCENTS.sky} strokeWidth={2.5} fill="none" /> : null}

          {/* Krzywa Stres */}
          {stressPath ? <Path d={stressPath} stroke={ACCENTS.error} strokeWidth={2.5} fill="none" /> : null}

          {/* Kropki na ostatnim punkcie */}
          {lastCalm ? <Circle cx={lastCalm.x} cy={lastCalm.y} r={4} fill={ACCENTS.sky} /> : null}
          {lastStress ? <Circle cx={lastStress.x} cy={lastStress.y} r={4} fill={ACCENTS.error} /> : null}
        </Svg>
      </View>

      {labels.length > 0 ? (
        <View style={styles.labelsRow}>
          {labels.map((item, index) => (
            <Text key={`${item.label}-${index}`} style={[styles.axisLabel, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
          ))}
        </View>
      ) : null}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    margin: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  svgWrapper: {
    width: '100%',
    height: CHART_HEIGHT,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  axisLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
