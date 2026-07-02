import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { useGamificationStore, BADGES_DICTIONARY } from '../../application/store/useGamificationStore';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard, GradientText } from '../components/UIPrimitives';

export const BadgesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  const { unlockedBadges, currentStreak } = useGamificationStore();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { borderColor: colors.tileBorder, backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)' }]}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <GradientText text="Osiągnięcia" style={styles.title} colors={['#A78BFA', '#F472B6', '#60A5FA']} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard intensity={theme === 'AppleLight' ? 60 : 15} style={styles.streakCard}>
          <Text style={[styles.streakTitle, { color: colors.textSecondary }]}>Twoja obecna seria</Text>
          <View style={styles.streakRow}>
            <Feather name="zap" size={32} color={currentStreak > 0 ? colors.primary : colors.textSecondary} />
            <Text style={[styles.streakValue, { color: colors.text }]}>{currentStreak} dni</Text>
          </View>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gablota Odznak</Text>
        
        <View style={styles.badgesGrid}>
          {BADGES_DICTIONARY.map((badge) => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            return (
              <GlassCard 
                key={badge.id} 
                intensity={isUnlocked ? (theme === 'AppleLight' ? 60 : 15) : 5} 
                style={[styles.badgeContainer, !isUnlocked && { opacity: 0.6 }]}
              >
                {isUnlocked ? (
                  <LinearGradient
                    colors={colors.gradientColors as any}
                    style={styles.iconCircle}
                  >
                    <Feather name={badge.icon as any} size={28} color="#FFF" />
                  </LinearGradient>
                ) : (
                  <View style={[styles.iconCircle, { backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }]}>
                    <Feather name="lock" size={28} color={colors.textSecondary} />
                  </View>
                )}
                
                <Text style={[styles.badgeTitle, { color: isUnlocked ? colors.text : colors.textSecondary }]}>
                  {badge.title}
                </Text>
                <Text style={[styles.badgeDesc, { color: isUnlocked ? colors.textSecondary : 'rgba(150,150,150,0.6)' }]}>
                  {badge.description}
                </Text>
              </GlassCard>
            );
          })}
        </View>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  streakCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 30,
    borderRadius: 24,
  },
  streakTitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 42,
    fontWeight: '800',
    marginLeft: 12,
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#ffffff',
    paddingLeft: 4,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeContainer: {
    width: '48%',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  }
});
