import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Feather } from '@expo/vector-icons';
import { useGamificationStore } from '../../application/store/useGamificationStore';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { LinearGradient } from 'expo-linear-gradient';

export const BadgeAlertModal = () => {
  const { newlyUnlockedBadge, dismissBadgeAlert } = useGamificationStore();
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];

  if (!newlyUnlockedBadge) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!newlyUnlockedBadge}
      onRequestClose={dismissBadgeAlert}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.tileBorder }]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Nowe Osiągnięcie!</Text>
          
          <LinearGradient
            colors={colors.gradientColors as unknown as [string, string, ...string[]]}
            style={styles.iconCircle}
          >
            <Feather name={newlyUnlockedBadge.icon as any} size={40} color="#FFF" />
          </LinearGradient>

          <Text style={[styles.title, { color: colors.text }]}>{newlyUnlockedBadge.title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{newlyUnlockedBadge.description}</Text>

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={dismissBadgeAlert}>
            <Text style={styles.buttonText}>Świetnie!</Text>
          </TouchableOpacity>
        </View>

        <ConfettiCannon 
          count={150} 
          origin={{ x: -10, y: 0 }} 
          colors={colors.gradientColors as unknown as string[]} 
          fadeOut 
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
