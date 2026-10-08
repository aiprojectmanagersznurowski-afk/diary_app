import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { DailyDocument } from '../../../domain/models/DailyDocument';
import { NoteDocument } from '../../../domain/models/NoteDocument';
import { Recording } from '../../../domain/models/Recording';
import { RelatedThought } from '../../../domain/models/RelatedThought';
import { BackButton, GlassCard, GradientText, NoteTypeChip, ScreenContainer, SectionLabel, useTheme } from '../ui';
import { pl } from '../../i18n/pl';
import { formatClock, formatLongDate } from '../home/homeLogic';
import { RelatedThoughtsSection } from './RelatedThoughtsSection';
import { RoundTableSection } from './RoundTableSection';
import { dilemmaAdvisoryRepository } from '../../../composition';
import { noteSource, sourceText } from './detailLogic';

interface NoteDetailProps {
  note: NoteDocument;
  /** Wpis dnia tej notatki, jeśli jest załadowany. */
  daily?: DailyDocument;
  recordings: Recording[];
  related: { items: RelatedThought[]; isLoading: boolean; error: string | null };
  onOpen: (documentId: string) => void;
}

/** Szczegóły notatki: chip typu, tytuł, treść, data i źródło, link do wpisu dnia i powiązane myśli (§2.7). */
export const NoteDetail: React.FC<NoteDetailProps> = ({ note, daily, recordings, related, onOpen }) => {
  const { colors } = useTheme();
  const source = noteSource(note, recordings);
  const sourceLabel = sourceText(source);
  const longDate = formatLongDate(note.day);
  const isDilemma = note.categoryName === 'Dylematy';

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <BackButton />
          <Text style={[styles.barTitle, { color: colors.text }]}>{pl.detail.noteTitle}</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.chipsRow}>
          <NoteTypeChip type={note.noteType} />
          {note.categoryName ? (
            <View style={[styles.categoryBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="folder" size={12} color={colors.textSecondary} />
              <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{note.categoryName}</Text>
            </View>
          ) : null}
        </View>
        <GradientText text={note.title} style={styles.title} />

        <GlassCard>
          <Text style={[styles.text, { color: colors.text }]}>{note.content}</Text>
          <View style={styles.meta}>
            <Feather name="clock" size={16} color={colors.textSecondary} />
            <Text
              style={[styles.metaText, { color: colors.textSecondary }]}
            >{`${longDate} · ${formatClock(note.createdAt)}`}</Text>
          </View>
          {sourceLabel ? (
            <View style={styles.meta}>
              <Feather name={source === 'watch' ? 'watch' : 'smartphone'} size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{sourceLabel}</Text>
            </View>
          ) : null}
        </GlassCard>

        {isDilemma ? <RoundTableSection documentId={note.id} repository={dilemmaAdvisoryRepository} /> : null}

        <SectionLabel style={styles.label}>{pl.detail.dayEntry}</SectionLabel>
        <GlassCard
          padding={14}
          onPress={daily ? () => onOpen(daily.id) : undefined}
          accessibilityLabel={pl.detail.dayEntry}
        >
          <View style={styles.dayRow}>
            <LinearGradient
              colors={colors.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dot}
            />
            <View style={styles.dayMid}>
              <Text style={[styles.dayTitle, { color: colors.text }]} numberOfLines={2}>
                {daily?.dominantThought || longDate}
              </Text>
              <Text style={[styles.daySub, { color: colors.textSecondary }]}>{longDate}</Text>
            </View>
            {daily ? <Feather name="chevron-right" size={18} color={colors.textSecondary} /> : null}
          </View>
        </GlassCard>

        <RelatedThoughtsSection
          thoughts={related.items}
          isLoading={related.isLoading}
          error={related.error}
          onThoughtPress={onOpen}
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 64 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: 14,
  },
  barTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  spacer: { width: 40 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32, marginTop: 10, marginBottom: 16 },
  text: { fontSize: 16, lineHeight: 24 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  metaText: { fontSize: 13 },
  label: { marginTop: 26, marginBottom: 10, marginLeft: 4 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dayMid: { flex: 1, minWidth: 0 },
  dayTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  daySub: { fontSize: 13, marginTop: 2 },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
