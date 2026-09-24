import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-gifted-charts';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import { GlassCard, GradientText } from '../components/UIPrimitives';

import { useDiaryStore } from '../../application/store/useDiaryStore';
import { getAnalyticsData } from '../../application/useCases/statsUseCase';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';

const { width } = Dimensions.get('window');

// Circular Gauge Component
const CircularGauge = ({ percentage, colors }: { percentage: number; colors: any }) => {
  const size = 180;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#A78BFA" />
            <Stop offset="50%" stopColor="#F472B6" />
            <Stop offset="100%" stopColor="#60A5FA" />
          </SvgLinearGradient>
        </Defs>
        {/* Background Circle */}
        <Circle
          stroke="rgba(255,255,255,0.05)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress Circle */}
        <Circle
          stroke="url(#grad)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.gaugeTextContainer}>
        <GradientText text={`${percentage}%`} colors={['#A78BFA', '#F472B6', '#60A5FA']} style={styles.gaugeNumber} />
        <Text style={[styles.gaugeSubtext, { color: colors.textSecondary }]}>zgodności</Text>
      </View>
    </View>
  );
};

export const InsightsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');
  const { entries } = useDiaryStore();
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];

  const analyticsData = useMemo(() => {
    return getAnalyticsData(entries, timeRange === '7d' ? 7 : 30);
  }, [entries, timeRange]);

  const dataLength = timeRange === '7d' ? 7 : 30;
  const chartWidth = width - 100; // Account for container padding
  const dynamicSpacing = chartWidth / dataLength;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backButton,
            {
              borderColor: colors.tileBorder,
              backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
            },
          ]}
        >
          <Feather name="chevron-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <GradientText text="Twoje Analizy" style={styles.headerTitle} colors={['#A78BFA', '#F472B6', '#60A5FA']} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Time Segmented Control */}
        <View style={styles.segmentContainer}>
          <View
            style={[
              styles.segmentCard,
              {
                backgroundColor:
                  theme === 'AppleLight' || theme === 'Sepia' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
              },
            ]}
          >
            <TouchableOpacity style={[styles.segmentButton]} onPress={() => setTimeRange('7d')} activeOpacity={0.8}>
              {timeRange === '7d' && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary, borderRadius: 12 }]} />
              )}
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: timeRange === '7d' ? (theme === 'Sepia' ? '#FFFFFF' : '#FFFFFF') : colors.textSecondary,
                    fontWeight: timeRange === '7d' ? 'bold' : 'normal',
                  },
                ]}
              >
                7 Dni
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.segmentButton} onPress={() => setTimeRange('30d')} activeOpacity={0.8}>
              {timeRange === '30d' && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary, borderRadius: 12 }]} />
              )}
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: timeRange === '30d' ? (theme === 'Sepia' ? '#FFFFFF' : '#FFFFFF') : colors.textSecondary,
                    fontWeight: timeRange === '30d' ? 'bold' : 'normal',
                  },
                ]}
              >
                30 Dni
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chart 1: Stress vs Calm */}
        <GlassCard intensity={theme === 'AppleLight' ? 60 : 15} style={styles.chartCard}>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Stres vs. Spokój</Text>
          <View style={styles.chartWrapper}>
            <LineChart
              data={analyticsData.stress}
              data2={analyticsData.calm}
              height={180}
              width={chartWidth}
              spacing={dynamicSpacing}
              initialSpacing={10}
              disableScroll={true}
              color1="#F87171" // Coral Red for Stress
              color2="#38BDF8" // Blue for Calm
              textColor1="#F87171"
              dataPointsHeight={6}
              dataPointsWidth={6}
              dataPointsColor1="#F87171"
              dataPointsColor2="#38BDF8"
              thickness={3}
              curved
              hideDataPoints={timeRange === '30d'}
              hideRules={false}
              rulesColor="rgba(255,255,255,0.05)"
              rulesType="solid"
              yAxisColor="transparent"
              xAxisColor={colors.tileBorder}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{
                color: colors.textSecondary,
                fontSize: 11,
              }}
              pointerConfig={{
                pointerStripHeight: 160,
                pointerStripColor: 'rgba(255,255,255,0.2)',
                pointerStripWidth: 2,
                pointerColor: 'rgba(255,255,255,0.8)',
                radius: 6,
                pointerLabelWidth: 100,
                pointerLabelHeight: 90,
                activatePointersOnLongPress: true,
                autoAdjustPointerLabelPosition: true,
              }}
            />
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F87171' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Stres</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#38BDF8' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Spokój</Text>
            </View>
          </View>
        </GlassCard>

        {/* Chart 2: Energy Area Chart */}
        <GlassCard intensity={theme === 'AppleLight' ? 60 : 15} style={styles.chartCard}>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
            Energia / zmęczenie w ciągu tygodnia
          </Text>
          <View style={styles.chartWrapper}>
            <LineChart
              areaChart
              data={analyticsData.energy}
              height={180}
              width={chartWidth}
              spacing={dynamicSpacing}
              initialSpacing={10}
              disableScroll={true}
              color="#A78BFA"
              thickness={3}
              startFillColor="rgba(167, 139, 250, 0.4)"
              endFillColor="rgba(167, 139, 250, 0.01)"
              startOpacity={0.9}
              endOpacity={0.2}
              curved
              hideDataPoints
              hideRules
              yAxisColor="transparent"
              xAxisColor={colors.tileBorder}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{
                color: colors.textSecondary,
                fontSize: 11,
              }}
            />
          </View>
        </GlassCard>

        {/* Chart 3: Goal Alignment */}
        <GlassCard intensity={theme === 'AppleLight' ? 60 : 15} style={styles.chartCard}>
          <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Zgodność z celami życiowymi</Text>
          <View style={styles.gaugeWrapper}>
            <CircularGauge percentage={analyticsData.goalAlignment} colors={colors} />
          </View>
          <Text style={[styles.gaugeDescription, { color: colors.text }]}>
            {analyticsData.goalAlignment > 70
              ? 'Ostatnie dni świetnie przybliżyły Cię do celów'
              : analyticsData.goalAlignment > 40
                ? 'Trzymasz się całkiem nieźle, oby tak dalej'
                : 'Bywało lepiej. Pamiętaj, że każdy ma słabsze dni'}
          </Text>
        </GlassCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  segmentContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  segmentCard: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    width: '100%',
    maxWidth: 300,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  segmentText: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    fontSize: 15,
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  chartCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
  },
  chartSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
  },
  chartWrapper: {
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  gaugeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeNumber: {
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 50,
  },
  gaugeSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  gaugeDescription: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '500',
  },
});
