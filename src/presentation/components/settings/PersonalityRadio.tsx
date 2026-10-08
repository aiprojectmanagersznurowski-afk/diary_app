import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard, useTheme } from '../ui';
import { AIPersonality } from '../../../application/store/useSettingsStore';
import { pl } from '../../i18n/pl';

export interface PersonalityOption {
  id: AIPersonality;
  name: string;
  subtitle?: string;
  desc: string;
  preview: string;
}

export const PERSONALITY_OPTIONS: PersonalityOption[] = [
  {
    id: 'Po prostu przyjaciel',
    name: pl.settings.personalities.friend.name,
    subtitle: pl.settings.personalities.friend.subtitle,
    desc: pl.settings.personalities.friend.desc,
    preview: pl.settings.personalities.friend.preview,
  },
  {
    id: 'Buddha',
    name: pl.settings.personalities.buddha.name,
    subtitle: pl.settings.personalities.buddha.subtitle,
    desc: pl.settings.personalities.buddha.desc,
    preview: pl.settings.personalities.buddha.preview,
  },
  {
    id: 'Józef Piłsudski',
    name: pl.settings.personalities.pilsudski.name,
    subtitle: pl.settings.personalities.pilsudski.subtitle,
    desc: pl.settings.personalities.pilsudski.desc,
    preview: pl.settings.personalities.pilsudski.preview,
  },
  {
    id: 'Stefan Banach',
    name: pl.settings.personalities.banach.name,
    subtitle: pl.settings.personalities.banach.subtitle,
    desc: pl.settings.personalities.banach.desc,
    preview: pl.settings.personalities.banach.preview,
  },
  {
    id: 'David Deida',
    name: pl.settings.personalities.deida.name,
    subtitle: pl.settings.personalities.deida.subtitle,
    desc: pl.settings.personalities.deida.desc,
    preview: pl.settings.personalities.deida.preview,
  },
  {
    id: 'Andrew Huberman',
    name: pl.settings.personalities.huberman.name,
    subtitle: pl.settings.personalities.huberman.subtitle,
    desc: pl.settings.personalities.huberman.desc,
    preview: pl.settings.personalities.huberman.preview,
  },
];

interface PersonalityRadioProps {
  selected: AIPersonality;
  onSelect: (personality: AIPersonality) => void;
}

export const PersonalityRadio: React.FC<PersonalityRadioProps> = ({ selected, onSelect }) => {
  const { colors } = useTheme();

  const currentOption = PERSONALITY_OPTIONS.find((opt) => opt.id === selected) || PERSONALITY_OPTIONS[0];

  return (
    <GlassCard padding={16} style={styles.card}>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{pl.settings.personalitySubtitle}</Text>

      {PERSONALITY_OPTIONS.map((option, index) => {
        const isSelected = option.id === selected;
        const isLast = index === PERSONALITY_OPTIONS.length - 1;

        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            style={[styles.optionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
          >
            {/* Kółko radio */}
            <View style={[styles.radioCircle, { borderColor: isSelected ? colors.primary : colors.textSecondary }]}>
              {isSelected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
            </View>

            {/* Treść */}
            <View style={styles.optionContent}>
              <View style={styles.titleRow}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>{option.name}</Text>
                {option.subtitle ? (
                  <Text style={[styles.optionSubtitle, { color: colors.primary }]}>{option.subtitle}</Text>
                ) : null}
              </View>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{option.desc}</Text>
            </View>
          </Pressable>
        );
      })}

      {/* Podgląd rady */}
      <View style={[styles.previewBox, { backgroundColor: colors.card2, borderColor: colors.border }]}>
        <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Próbka głosu Narratora:</Text>
        <Text style={[styles.previewText, { color: colors.text }]}>{currentOption.preview}</Text>
      </View>

      {/* Zastrzeżenie prawne i bezpieczeństwa */}
      <View style={styles.disclaimerBox}>
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          {pl.settings.personalities.disclaimer}
        </Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  optionContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  previewBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  disclaimerBox: {
    marginTop: 12,
    paddingTop: 8,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 15,
    fontStyle: 'italic',
  },
});
