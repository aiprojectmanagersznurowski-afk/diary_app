import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard, useTheme } from '../ui';
import { AIPersonality } from '../../../application/store/useSettingsStore';
import { pl } from '../../i18n/pl';

interface PersonalityOption {
  id: AIPersonality;
  name: string;
  desc: string;
  preview: string;
}

export const PERSONALITY_OPTIONS: PersonalityOption[] = [
  {
    id: 'Po prostu przyjaciel',
    name: pl.settings.personalities.friend.name,
    desc: pl.settings.personalities.friend.desc,
    preview: pl.settings.personalities.friend.preview,
  },
  {
    id: 'Buddha',
    name: pl.settings.personalities.buddha.name,
    desc: pl.settings.personalities.buddha.desc,
    preview: pl.settings.personalities.buddha.preview,
  },
  {
    id: 'Józef Piłsudski',
    name: pl.settings.personalities.pilsudski.name,
    desc: pl.settings.personalities.pilsudski.desc,
    preview: pl.settings.personalities.pilsudski.preview,
  },
  {
    id: 'Stefan Banach',
    name: pl.settings.personalities.banach.name,
    desc: pl.settings.personalities.banach.desc,
    preview: pl.settings.personalities.banach.preview,
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
              <Text style={[styles.optionTitle, { color: colors.text }]}>{option.name}</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{option.desc}</Text>
            </View>
          </Pressable>
        );
      })}

      {/* Podgląd rady */}
      <View style={[styles.previewBox, { backgroundColor: colors.card2, borderColor: colors.border }]}>
        <Text style={[styles.previewText, { color: colors.text }]}>{currentOption.preview}</Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingBottom: 16,
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
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
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
  previewText: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
});
