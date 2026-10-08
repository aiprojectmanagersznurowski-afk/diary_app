import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  BackButton,
  GradientText,
  ScreenContainer,
  SegmentedControl,
  titleTextStyle,
  useTheme,
} from '../components/ui';
import { DominantEmotionsHistogram, GoalAlignmentHistoryChart, GoalAlignmentRing } from '../components/insights';
import {
  AnalyticsData,
  dayStringOffsetFromToday,
  getDailyAnalyticsData,
  getGoalAlignmentMessage,
} from '../../application/useCases/statsUseCase';
import { getDailyDocumentsInRangeUseCase } from '../../composition';
import { pl } from '../i18n/pl';

const EMPTY_ANALYTICS: AnalyticsData = {
  goalAlignment: 0,
  goalHistory: [],
  dominantEmotions: [],
};

const RANGE_OPTIONS = [
  { key: '7d', label: pl.insights.range7 },
  { key: '30d', label: pl.insights.range30 },
] as const;

type TimeRangeKey = (typeof RANGE_OPTIONS)[number]['key'];

/** Ekran „Twoje Analizy” (docs/08-design-ui.md §2.8). */
export const InsightsScreen = () => {
  const { colors } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('7d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(EMPTY_ANALYTICS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const days = timeRange === '7d' ? 7 : 30;
    let cancelled = false;
    setIsLoading(true);

    const startDay = dayStringOffsetFromToday(-(days - 1));
    const endDay = dayStringOffsetFromToday(0);

    getDailyDocumentsInRangeUseCase
      .execute(startDay, endDay)
      .then((dailyDocs) => {
        if (!cancelled) {
          setAnalyticsData(getDailyAnalyticsData(dailyDocs, days));
        }
      })
      .catch((err) => {
        console.warn('Błąd pobierania danych analitycznych:', err);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  const goalMessage = getGoalAlignmentMessage(analyticsData.goalAlignment);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* TopBar */}
        <View style={styles.topBar}>
          <BackButton />
          <Text style={[styles.barTitle, { color: colors.text }]}>{pl.insights.barTitle}</Text>
          <View style={styles.barSpacer} />
        </View>

        {/* Tytuł */}
        <GradientText text={pl.insights.title} style={titleTextStyle} />

        {/* Przełącznik 7 dni / 30 dni */}
        <View style={styles.segWrapper}>
          <SegmentedControl options={RANGE_OPTIONS} value={timeRange} onChange={setTimeRange} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{pl.insights.loading}</Text>
          </View>
        ) : (
          <View style={styles.chartsWrapper}>
            {/* 1. Pierścień zgodności z celami życiowymi (ZAWSZE U GÓRY) */}
            <GoalAlignmentRing percentage={analyticsData.goalAlignment} message={goalMessage} />

            {/* 2. Wykres ostatnich dni z wynikiem zgodności celów */}
            <GoalAlignmentHistoryChart history={analyticsData.goalHistory} timeRange={timeRange} />

            {/* 3. Dominujące emocje (w ujęciu 7 dni i 30 dni) */}
            <DominantEmotionsHistogram emotions={analyticsData.dominantEmotions} />
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  barTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  barSpacer: {
    width: 40,
  },
  segWrapper: {
    marginVertical: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  chartsWrapper: {
    gap: 16,
  },
});
