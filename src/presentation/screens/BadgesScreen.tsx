import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import {
  ACCENTS,
  BackButton,
  GlassCard,
  GradientText,
  PILL_TEXT,
  ScreenContainer,
  SectionLabel,
  useTheme,
  WHITE,
} from '../components/ui';
import {
  BADGES_DICTIONARY,
  getNextBadgeInfo,
  getStreakWeekDots,
  useGamificationStore,
} from '../../application/store/useGamificationStore';
import { pl } from '../i18n/pl';

/** Ekran „Osiągnięcia” (docs/08-design-ui.md §2.9). */
export const BadgesScreen = () => {
  const { colors } = useTheme();
  const { currentStreak, unlockedBadges, syncFromCloud } = useGamificationStore();

  useEffect(() => {
    void syncFromCloud();
  }, [syncFromCloud]);

  const weekDots = getStreakWeekDots(currentStreak);
  const nextInfo = getNextBadgeInfo(currentStreak);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* TopBar */}
        <View style={styles.topBar}>
          <BackButton />
          <Text style={[styles.barTitle, { color: colors.text }]}>{pl.badges.barTitle}</Text>
          <View style={styles.barSpacer} />
        </View>

        {/* Karta serii (Streak Hero) */}
        <GlassCard style={styles.streakHero}>
          <SectionLabel style={styles.streakHeroLabel}>{pl.badges.currentStreak}</SectionLabel>

          {/* Duży płomień SVG */}
          <Svg width={64} height={64} viewBox="0 0 24 24" style={styles.flameSvg}>
            <Defs>
              <SvgLinearGradient id="flameG" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0" stopColor={ACCENTS.pink} />
                <Stop offset="1" stopColor={ACCENTS.amber} />
              </SvgLinearGradient>
            </Defs>
            <Path
              d="M12 2c1.2 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-3 1.6-4.7 2.8-5.8.2 1.8 1.1 2.9 2.2 3.4.4-3.2-.7-5.8.5-8.6z"
              fill="url(#flameG)"
            />
          </Svg>

          {/* Liczba serii */}
          <GradientText text={String(currentStreak)} style={styles.streakNumber} />
          <Text style={[styles.streakUnit, { color: colors.textSecondary }]}>{pl.badges.unitDays(currentStreak)}</Text>

          {/* 7 kropek tygodnia */}
          <View style={styles.dotsRow}>
            {weekDots.map((isActive, idx) => (
              <View key={idx} style={[styles.dot, isActive ? styles.dotActive : { backgroundColor: colors.track }]}>
                {isActive ? (
                  <LinearGradient
                    colors={[ACCENTS.amber, ACCENTS.pink]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                ) : null}
                <Feather name="check" size={13} color={isActive ? PILL_TEXT : colors.textSecondary} />
              </View>
            ))}
          </View>

          {/* Do kolejnej odznaki brakuje... */}
          <Text style={[styles.nextBadgeText, { color: colors.textSecondary }]}>
            {nextInfo.targetBadge
              ? pl.badges.nextBadge(nextInfo.targetBadge.title, nextInfo.daysRemaining)
              : pl.badges.allUnlocked}
          </Text>
        </GlassCard>

        {/* Gablota odznak */}
        <SectionLabel style={styles.cabinetLabel}>{pl.badges.cabinet}</SectionLabel>
        <View style={styles.badgesStack}>
          {BADGES_DICTIONARY.map((badge) => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            const reqKey = badge.id as keyof typeof pl.badges.requirements;
            const reqText = pl.badges.requirements[reqKey] || badge.description;

            return (
              <GlassCard key={badge.id} style={[styles.badgeCard, !isUnlocked && styles.badgeLocked]}>
                <View style={styles.badgeRow}>
                  {/* Ikona odznaki */}
                  <View style={styles.iconCircleWrapper}>
                    {isUnlocked ? (
                      <LinearGradient
                        colors={[ACCENTS.amber, ACCENTS.pink]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconCircle}
                      >
                        <Feather name={badge.icon as any} size={26} color={WHITE} />
                      </LinearGradient>
                    ) : (
                      <View style={[styles.iconCircle, { backgroundColor: colors.track }]}>
                        <Feather name="lock" size={26} color={colors.textSecondary} />
                      </View>
                    )}
                  </View>

                  {/* Informacje o odznace */}
                  <View style={styles.badgeContent}>
                    <Text style={[styles.badgeTitle, { color: colors.text }]}>{badge.title}</Text>
                    <Text style={[styles.badgeDesc, { color: colors.textSecondary }]}>{badge.description}</Text>
                    <View style={styles.badgeReqRow}>
                      <Feather
                        name={isUnlocked ? 'check' : 'lock'}
                        size={13}
                        color={isUnlocked ? ACCENTS.success : colors.textSecondary}
                      />
                      <Text
                        style={[styles.badgeReqText, { color: isUnlocked ? colors.primary : colors.textSecondary }]}
                      >
                        {isUnlocked ? pl.badges.unlockedReq(reqText) : pl.badges.lockedReq(reqText)}
                      </Text>
                    </View>
                  </View>
                </View>
              </GlassCard>
            );
          })}
        </View>
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
  streakHero: {
    alignItems: 'center',
    paddingVertical: 26,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  streakHeroLabel: {
    margin: 0,
    marginTop: 0,
    marginBottom: 8,
    marginLeft: 0,
  },
  flameSvg: {
    marginVertical: 4,
  },
  streakNumber: {
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 76,
  },
  streakUnit: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dotActive: {
    overflow: 'hidden',
  },
  nextBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  cabinetLabel: {
    marginBottom: 12,
  },
  badgesStack: {
    gap: 12,
  },
  badgeCard: {
    padding: 16,
  },
  badgeLocked: {
    opacity: 0.45,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircleWrapper: {
    flexShrink: 0,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContent: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  badgeDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  badgeReqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  badgeReqText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
