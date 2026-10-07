import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BackButton, Chip, GlassCard, ScreenContainer, SectionLabel, useTheme } from '../components/ui';
import { ManagementCard, PersonalityRadio, ThemeSelector } from '../components/settings';
import { useSettingsStore } from '../../application/store/useSettingsStore';
import { useAuthService } from '../../composition';
import { RootStackParamList } from '../../navigation/types';
import { pl } from '../i18n/pl';

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

/** Ekran „Ustawienia” (docs/08-design-ui.md §2.10). */
export const SettingsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<SettingsNavigationProp>();
  const authService = useAuthService();

  const { theme, setTheme, clearGoals, lifeGoals, aiPersonality, setAIPersonality } = useSettingsStore();

  const handleResetGoals = () => {
    clearGoals();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Onboarding' }],
    });
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (e) {
      console.warn('Błąd wylogowania:', e);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* TopBar */}
        <View style={styles.topBar}>
          <BackButton />
          <Text style={[styles.barTitle, { color: colors.text }]}>{pl.settings.barTitle}</Text>
          <View style={styles.barSpacer} />
        </View>

        {/* Twoje Aktualne Cele Życiowe */}
        <SectionLabel style={styles.sectionLabel}>{pl.settings.goalsTitle}</SectionLabel>
        <GlassCard padding={16}>
          {lifeGoals.length > 0 ? (
            <View style={styles.chipsRow}>
              {lifeGoals.map((goal, idx) => (
                <Chip key={`${goal}-${idx}`} label={goal} />
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyGoalsText, { color: colors.textSecondary }]}>{pl.settings.noGoals}</Text>
          )}
        </GlassCard>

        {/* Osobowość AI */}
        <SectionLabel style={styles.sectionLabel}>{pl.settings.personalityTitle}</SectionLabel>
        <PersonalityRadio selected={aiPersonality} onSelect={setAIPersonality} />

        {/* Wybór Motywu Akcentów */}
        <SectionLabel style={styles.sectionLabel}>{pl.settings.themeTitle}</SectionLabel>
        <ThemeSelector selected={theme} onSelect={setTheme} />

        {/* Zarządzanie */}
        <SectionLabel style={styles.sectionLabel}>{pl.settings.managementTitle}</SectionLabel>
        <ManagementCard onResetGoals={handleResetGoals} onLogout={handleLogout} />

        {/* Stopka */}
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>{pl.settings.footer}</Text>
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
  sectionLabel: {
    marginTop: 20,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyGoalsText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 28,
  },
});
