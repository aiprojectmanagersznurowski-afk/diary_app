import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore, THEMES, ThemeName, AIPersonality } from '../../application/store/useSettingsStore';
import { useGamificationStore } from '../../application/store/useGamificationStore';
import { authService } from '../../composition/auth';
import { GlassCard, GradientText } from '../components/UIPrimitives';

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, setTheme, clearGoals, lifeGoals, aiPersonality, setAIPersonality } = useSettingsStore();
  const { clearGamification } = useGamificationStore();

  const colors = THEMES[theme];

  const handleLogout = async () => {
    try {
      clearGamification();
      await authService.signOut();
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearGoals = () => {
    clearGoals();
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backButton,
            {
              borderColor: colors.tileBorder,
              backgroundColor:
                theme === 'AppleLight' || theme === 'Sepia' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
            },
          ]}
        >
          <Feather name="chevron-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <GradientText text="Ustawienia" style={styles.headerTitle} colors={['#A78BFA', '#F472B6', '#60A5FA']} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* We keep the theme selection purely functional but style it as glass cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Wybór Motywu Akcentów</Text>
          <View style={styles.themeRow}>
            {(Object.keys(THEMES) as ThemeName[]).map((themeName) => {
              const themeColors = THEMES[themeName];
              const isSelected = themeName === theme;
              const displayName = themeName === 'AppleDark' ? 'Dark' : themeName === 'Sepia' ? 'Sepia' : 'Light';
              return (
                <TouchableOpacity
                  key={themeName}
                  activeOpacity={0.7}
                  onPress={() => setTheme(themeName)}
                  style={{ flex: 1 }}
                >
                  <GlassCard
                    intensity={isSelected ? 20 : 10}
                    style={[
                      styles.themeButton,
                      isSelected && {
                        borderColor: themeColors.primary,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View style={[styles.themeColorCircle, { backgroundColor: themeColors.primary }]} />
                    <Text
                      style={[
                        styles.themeText,
                        {
                          color: isSelected ? colors.text : colors.textSecondary,
                        },
                      ]}
                    >
                      {displayName}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={themeColors.primary}
                        style={styles.checkIcon}
                      />
                    )}
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Osobowość AI</Text>
          <View style={styles.personalityContainer}>
            {(['Po prostu przyjaciel', 'Buddha', 'Józef Piłsudski', 'Stefan Banach'] as AIPersonality[]).map(
              (persona) => {
                const isSelected = persona === aiPersonality;
                return (
                  <TouchableOpacity
                    key={persona}
                    activeOpacity={0.7}
                    onPress={() => setAIPersonality(persona)}
                    style={{ marginBottom: 12 }}
                  >
                    <GlassCard
                      intensity={isSelected ? 20 : 10}
                      style={[
                        styles.personalityButton,
                        isSelected && {
                          borderColor: colors.primary,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <View style={styles.personalityButtonInner}>
                        <Text
                          style={[
                            styles.personalityText,
                            {
                              color: isSelected ? colors.text : colors.textSecondary,
                            },
                          ]}
                        >
                          {persona}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                );
              },
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Twoje Aktualne Cele Życiowe</Text>
          <GlassCard intensity={10} style={styles.goalsCard}>
            <View style={styles.tagsContainer}>
              {lifeGoals.map((goal, index) => (
                <View
                  key={index}
                  style={[
                    styles.goalTag,
                    {
                      backgroundColor:
                        theme === 'AppleLight' || theme === 'Sepia' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                      borderColor: colors.tileBorder,
                    },
                  ]}
                >
                  <Text style={[styles.goalTagText, { color: colors.text }]}>{goal}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Zarządzanie</Text>

          <TouchableOpacity activeOpacity={0.7} onPress={handleClearGoals}>
            <GlassCard
              intensity={15}
              style={[styles.dangerButton, { borderColor: 'rgba(248, 113, 113, 0.3)', borderWidth: 1 }]}
            >
              <View style={styles.buttonInner}>
                <Feather name="trash-2" size={20} color="#F87171" style={{ marginRight: 12 }} />
                <Text style={styles.dangerButtonText}>Zresetuj Cele Życiowe</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Wymazanie celów spowoduje ponowne przejście przez proces wprowadzający na ekranie głównym.
          </Text>
        </View>

        <View style={[styles.section, { marginTop: 20 }]}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleLogout}>
            <GlassCard intensity={15} style={[styles.dangerButton, { borderColor: colors.tileBorder, borderWidth: 1 }]}>
              <View style={styles.buttonInner}>
                <Feather name="log-out" size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                <Text style={[styles.dangerButtonText, { color: colors.textSecondary }]}>Wyloguj się</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 40,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.5)',
    paddingLeft: 4,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeButton: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeColorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 8,
  },
  themeText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  goalsCard: {
    padding: 20,
    borderRadius: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  goalTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  goalTagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  dangerButton: {
    borderRadius: 20,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: '600',
  },
  personalityContainer: {
    flexDirection: 'column',
  },
  personalityButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  personalityButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personalityText: {
    fontSize: 16,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
