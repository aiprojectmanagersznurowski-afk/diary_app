import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RelatedThought } from '../../../domain/models/RelatedThought';
import { GlassCard, NOTE_TYPE_STYLE, SectionLabel, useTheme } from '../ui';
import { pl } from '../../i18n/pl';
import { formatLongDate } from '../home/homeLogic';
import { relationTag } from './detailLogic';

interface RelatedThoughtsSectionProps {
  thoughts: RelatedThought[];
  isLoading: boolean;
  error?: string | null;
  onThoughtPress: (documentId: string) => void;
  disabled?: boolean;
}

/** Podpis pod tytułem powiązanej myśli: typ (notatka) albo „Wpis dnia” i data. */
function subtitle(thought: RelatedThought): string {
  const when = formatLongDate(thought.day);
  if (thought.kind === 'daily') return `${pl.detail.dayEntry} · ${when}`;
  const type = thought.noteType ? NOTE_TYPE_STYLE[thought.noteType]?.label : undefined;
  return type ? `${type} · ${when}` : when;
}

/** Sekcja „Powiązane myśli”: karty z kropką typu, tytułem, podpisem i tagiem relacji (docs/08-design-ui.md §2.6). */
export const RelatedThoughtsSection: React.FC<RelatedThoughtsSectionProps> = ({
  thoughts,
  isLoading,
  error,
  onThoughtPress,
  disabled = false,
}) => {
  const { colors } = useTheme();
  return (
    <View>
      <SectionLabel style={styles.label}>{pl.detail.related}</SectionLabel>

      {isLoading ? (
        <View style={styles.status}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>{pl.detail.relatedLoading}</Text>
        </View>
      ) : null}

      {!isLoading && error ? <Text style={[styles.empty, { color: colors.textSecondary }]}>{error}</Text> : null}

      {!isLoading && !error && thoughts.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>{pl.detail.relatedEmpty}</Text>
      ) : null}

      {!isLoading && !error && thoughts.length > 0 ? (
        <View style={styles.list}>
          {thoughts.map((thought) => (
            <GlassCard
              key={thought.documentId}
              padding={14}
              onPress={disabled ? undefined : () => onThoughtPress(thought.documentId)}
              accessibilityLabel={thought.title || thought.day}
            >
              <View style={styles.row}>
                {thought.kind === 'daily' || !thought.noteType ? (
                  <LinearGradient
                    colors={colors.gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dot}
                  />
                ) : (
                  <View style={[styles.dot, { backgroundColor: NOTE_TYPE_STYLE[thought.noteType].color }]} />
                )}
                <View style={styles.mid}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                    {thought.title || thought.day}
                  </Text>
                  <Text style={[styles.sub, { color: colors.textSecondary }]}>{subtitle(thought)}</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: colors.card2 }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{relationTag(thought)}</Text>
                </View>
              </View>
            </GlassCard>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { marginTop: 26, marginBottom: 10, marginLeft: 4 },
  list: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  mid: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  sub: { fontSize: 13, marginTop: 2 },
  tag: { borderRadius: 10, paddingVertical: 4, paddingHorizontal: 8 },
  tagText: { fontSize: 11, fontWeight: '700' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  statusText: { fontSize: 13 },
  empty: { textAlign: 'center', fontSize: 14, paddingVertical: 30, paddingHorizontal: 10 },
});
