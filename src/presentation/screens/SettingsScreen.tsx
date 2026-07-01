import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSettingsStore, THEMES, ThemeName } from '../../application/store/useSettingsStore';

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const { theme, setTheme, clearGoals, lifeGoals } = useSettingsStore();
  
  const colors = THEMES[theme];

  const handleClearGoals = () => {
    clearGoals();
    navigation.goBack(); // Może wrócić do home, a home przerzuci do onboardingu
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ustawienia</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Wybór Motywu</Text>
          <View style={styles.themeRow}>
            {(Object.keys(THEMES) as ThemeName[]).map((themeName) => {
              const themeColors = THEMES[themeName];
              const isSelected = themeName === theme;
              return (
                <TouchableOpacity 
                  key={themeName}
                  style={[
                    styles.themeButton,
                    { backgroundColor: themeColors.background, borderColor: themeColors.tileBorder },
                    isSelected && { borderColor: themeColors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => setTheme(themeName)}
                >
                  <View style={[styles.themeColorCircle, { backgroundColor: themeColors.primary }]} />
                  <Text style={[styles.themeText, { color: themeColors.text }]}>{themeName}</Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={themeColors.primary} style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Twoje Aktualne Cele</Text>
          <View style={styles.tagsContainer}>
            {lifeGoals.map((goal, index) => (
              <View key={index} style={[styles.goalTag, { backgroundColor: colors.tileBorder }]}>
                <Text style={[styles.goalTagText, { color: colors.text }]}>{goal}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Dane i Cele</Text>
          <TouchableOpacity 
            style={[styles.dangerButton, { borderColor: '#F87171' }]} 
            onPress={handleClearGoals}
          >
            <Feather name="trash-2" size={20} color="#F87171" style={{ marginRight: 10 }} />
            <Text style={styles.dangerButtonText}>Zresetuj swoje Cele Życiowe</Text>
          </TouchableOpacity>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
            Zresetowanie celów życiowych spowoduje przejście przez proces Onboardingu od nowa.
          </Text>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    gap: 40,
  },
  section: {
    gap: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  themeRow: {
    gap: 15,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
  },
  themeColorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 15,
  },
  themeText: {
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  dangerButtonText: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  goalTagText: {
    fontSize: 14,
    fontWeight: '500',
  }
});
