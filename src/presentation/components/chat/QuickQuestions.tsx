import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSettingsStore, THEMES } from '../../../application/store/useSettingsStore';

export interface QuickQuestionsProps {
  onSelectQuestion: (question: string) => void;
}

const DEFAULT_QUESTIONS = [
  'Jakie miałem wczoraj pomysły?',
  'Co zapisałem w tym tygodniu?',
  'Podsumuj moje ostatnie refleksje',
  'Jakie mam cele i postępy?',
];

export const QuickQuestions: React.FC<QuickQuestionsProps> = ({ onSelectQuestion }) => {
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Feather name="help-circle" size={13} color={colors.textSecondary} />
        <Text style={[styles.headerText, { color: colors.textSecondary }]}>Szybkie pytania do pamiętnika</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {DEFAULT_QUESTIONS.map((q, idx) => (
          <TouchableOpacity
            key={`quick-${idx}`}
            style={[
              styles.questionPill,
              {
                backgroundColor: theme === 'AppleLight' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)',
                borderColor: colors.tileBorder,
              },
            ]}
            onPress={() => onSelectQuestion(q)}
            activeOpacity={0.7}
          >
            <Text style={[styles.questionText, { color: colors.text }]}>{q}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  questionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  questionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
