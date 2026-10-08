import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard, useTheme } from '../ui';
import { pl } from '../../i18n/pl';

export interface RoundTableMemberOption {
  key: string;
  name: string;
  subtitle?: string;
  desc: string;
}

export const ROUND_TABLE_MEMBERS: RoundTableMemberOption[] = [
  {
    key: 'deida',
    name: pl.settings.personalities.deida.name,
    subtitle: pl.settings.personalities.deida.subtitle,
    desc: pl.settings.personalities.deida.desc,
  },
  {
    key: 'huberman',
    name: pl.settings.personalities.huberman.name,
    subtitle: pl.settings.personalities.huberman.subtitle,
    desc: pl.settings.personalities.huberman.desc,
  },
  {
    key: 'friend',
    name: pl.settings.personalities.friend.name,
    subtitle: pl.settings.personalities.friend.subtitle,
    desc: pl.settings.personalities.friend.desc,
  },
  {
    key: 'banach',
    name: pl.settings.personalities.banach.name,
    subtitle: pl.settings.personalities.banach.subtitle,
    desc: pl.settings.personalities.banach.desc,
  },
  {
    key: 'buddha',
    name: pl.settings.personalities.buddha.name,
    subtitle: pl.settings.personalities.buddha.subtitle,
    desc: pl.settings.personalities.buddha.desc,
  },
  {
    key: 'pilsudski',
    name: pl.settings.personalities.pilsudski.name,
    subtitle: pl.settings.personalities.pilsudski.subtitle,
    desc: pl.settings.personalities.pilsudski.desc,
  },
];

interface RoundTableMultiSelectProps {
  selectedKeys: string[];
  onToggle: (key: string) => void;
}

export const RoundTableMultiSelect: React.FC<RoundTableMultiSelectProps> = ({ selectedKeys, onToggle }) => {
  const { colors } = useTheme();

  return (
    <GlassCard padding={16} style={styles.card}>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{pl.settings.roundTableSubtitle}</Text>

      {ROUND_TABLE_MEMBERS.map((member, index) => {
        const isSelected = selectedKeys.includes(member.key);
        const isLast = index === ROUND_TABLE_MEMBERS.length - 1;

        return (
          <Pressable
            key={member.key}
            onPress={() => onToggle(member.key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            style={[styles.memberRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
          >
            {/* Checkbox box */}
            <View
              style={[
                styles.checkboxBox,
                {
                  borderColor: isSelected ? colors.primary : colors.textSecondary,
                  backgroundColor: isSelected ? colors.primary : 'transparent',
                },
              ]}
            >
              {isSelected ? <Text style={[styles.checkmark, { color: colors.onPrimary }]}>✓</Text> : null}
            </View>

            {/* Treść doradcy */}
            <View style={styles.memberContent}>
              <View style={styles.titleRow}>
                <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                {member.subtitle ? (
                  <Text style={[styles.memberSubtitle, { color: colors.primary }]}>{member.subtitle}</Text>
                ) : null}
              </View>
              <Text style={[styles.memberDesc, { color: colors.textSecondary }]}>{member.desc}</Text>
            </View>
          </Pressable>
        );
      })}

      <View style={[styles.hintBox, { backgroundColor: colors.card2, borderColor: colors.border }]}>
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          {pl.settings.roundTableLimitHint} Obecnie wybrano: {selectedKeys.length} doradców.
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
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 15,
  },
  memberContent: {
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
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  memberDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  hintBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
