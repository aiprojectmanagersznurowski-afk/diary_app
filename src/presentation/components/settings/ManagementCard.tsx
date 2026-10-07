import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ACCENTS, GlassCard, useTheme } from '../ui';
import { pl } from '../../i18n/pl';

interface ManagementCardProps {
  onResetGoals: () => void;
  onLogout: () => void;
}

export const ManagementCard: React.FC<ManagementCardProps> = ({ onResetGoals, onLogout }) => {
  const { colors } = useTheme();

  const handleResetPress = () => {
    Alert.alert(pl.settings.alerts.resetTitle, pl.settings.alerts.resetMsg, [
      { text: pl.common.cancel, style: 'cancel' },
      {
        text: pl.settings.alerts.resetConfirm,
        style: 'destructive',
        onPress: onResetGoals,
      },
    ]);
  };

  const handleLogoutPress = () => {
    Alert.alert(pl.settings.alerts.logoutTitle, pl.settings.alerts.logoutMsg, [
      { text: pl.common.cancel, style: 'cancel' },
      {
        text: pl.settings.alerts.logoutConfirm,
        style: 'destructive',
        onPress: onLogout,
      },
    ]);
  };

  return (
    <GlassCard padding={0} style={styles.card}>
      <View style={styles.content}>
        {/* Przycisk resetowania celów */}
        <Pressable
          onPress={handleResetPress}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { borderBottomColor: colors.border, borderBottomWidth: 1 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="rotate-ccw" size={18} color={colors.text} style={styles.icon} />
          <Text style={[styles.buttonText, { color: colors.text }]}>{pl.settings.resetGoals}</Text>
        </Pressable>

        {/* Przycisk wylogowania */}
        <Pressable
          onPress={handleLogoutPress}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, styles.dangerButton, pressed && { opacity: 0.7 }]}
        >
          <Feather name="log-out" size={18} color={ACCENTS.errorStrong} style={styles.icon} />
          <Text style={[styles.buttonText, { color: ACCENTS.errorStrong }]}>{pl.settings.logout}</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  dangerButton: {
    borderBottomWidth: 0,
  },
  icon: {
    marginRight: 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
