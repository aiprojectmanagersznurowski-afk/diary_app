import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useGamificationStore } from '../../application/store/useGamificationStore';
import { ACCENTS, PrimaryButton, SHADOW, WHITE, useTheme } from './ui';
import { pl } from '../i18n/pl';

/** Modal „Nowe Osiągnięcie!”: odznaki z kolejki pokazują się po kolei (docs/08-design-ui.md §2.4). */
export const BadgeAlertModal = () => {
  const badge = useGamificationStore((s) => s.newlyUnlockedBadge);
  const dismiss = useGamificationStore((s) => s.dismissBadgeAlert);
  const { colors } = useTheme();

  if (!badge) return null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismiss}>
      <View style={[styles.overlay, { backgroundColor: colors.veil }]}>
        <View style={[styles.card, { backgroundColor: colors.sheet, borderColor: colors.border }]}>
          <Text style={[styles.header, { color: colors.textSecondary }]}>{pl.badge.header}</Text>

          <LinearGradient
            colors={[ACCENTS.amber, ACCENTS.pink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.badge, { shadowColor: ACCENTS.amber }]}
          >
            <Feather name={badge.icon as React.ComponentProps<typeof Feather>['name']} size={44} color={WHITE} />
          </LinearGradient>

          <Text style={[styles.title, { color: colors.text }]}>{badge.title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{badge.description}</Text>

          <View style={styles.button}>
            <PrimaryButton label={pl.badge.dismiss} onPress={dismiss} />
          </View>
        </View>

        <ConfettiCannon count={150} origin={{ x: -10, y: 0 }} colors={[...colors.gradientColors]} fadeOut />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 34 },
  card: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 8,
    shadowColor: SHADOW,
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.35,
    shadowRadius: 60,
    elevation: 12,
  },
  header: { fontSize: 14, fontWeight: '700' },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 40,
  },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  description: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: 12 },
});
