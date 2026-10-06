import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { DailyDocument } from '../../../domain/models/DailyDocument';
import { EmotionPill, GlassCard, useTheme } from '../ui';
import { pl } from '../../i18n/pl';
import { formatLongDate } from './homeLogic';

/** Czas trwania podświetlenia dzisiejszego wpisu po przetworzeniu nagrania. */
export const HIGHLIGHT_MS = 2600;

interface EntryCardProps {
  entry: DailyDocument;
  isToday: boolean;
  /** Podświetl kartę (obwódka primary gaśnie przez ~2,6 s). */
  highlight?: boolean;
  onPress: () => void;
}

/** Karta wpisu dnia: data, plakietka „Dziś”, myśl dnia, streszczenie (3 linie) i emocje. */
export const EntryCard: React.FC<EntryCardProps> = ({ entry, isToday, highlight, onPress }) => {
  const { colors } = useTheme();
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlight) {
      glow.setValue(0);
      return undefined;
    }
    glow.setValue(1);
    const animation = Animated.timing(glow, {
      toValue: 0,
      duration: HIGHLIGHT_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [highlight, glow]);

  return (
    <View>
      <GlassCard onPress={onPress} accessibilityLabel={formatLongDate(entry.day)}>
        <View style={styles.header}>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{formatLongDate(entry.day)}</Text>
          {isToday ? (
            <View style={[styles.todayBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.todayText, { color: colors.onPrimary }]}>{pl.home.today}</Text>
            </View>
          ) : null}
        </View>
        {entry.dominantThought ? (
          <Text style={[styles.dominant, { color: colors.text }]}>{entry.dominantThought}</Text>
        ) : null}
        {entry.summary ? (
          <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={3}>
            {entry.summary}
          </Text>
        ) : null}
        {entry.emotions.length > 0 ? (
          <View style={styles.emotions}>
            {entry.emotions.map((emotion, index) => (
              <EmotionPill key={`${emotion}-${index}`} id={emotion} />
            ))}
          </View>
        ) : null}
      </GlassCard>
      <Animated.View
        pointerEvents="none"
        style={[styles.glow, { borderColor: colors.primary, shadowColor: colors.primary, opacity: glow }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  date: { fontSize: 13, fontWeight: '600' },
  todayBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
  todayText: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  dominant: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, lineHeight: 22, marginBottom: 8 },
  summary: { fontSize: 14, lineHeight: 20 },
  emotions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
  },
});
