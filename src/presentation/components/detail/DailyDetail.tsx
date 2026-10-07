import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DailyDocument } from '../../../domain/models/DailyDocument';
import { NoteDocument } from '../../../domain/models/NoteDocument';
import { RelatedThought } from '../../../domain/models/RelatedThought';
import {
  ACCENTS,
  Chip,
  GOAL_IMPACT_COLORS,
  GlassCard,
  GradientText,
  NOTE_TYPE_STYLE,
  PILL_TEXT,
  ScreenContainer,
  SectionLabel,
  resolveEmotion,
  useTheme,
  withAlpha,
} from '../ui';
import { pl } from '../../i18n/pl';
import { formatClock, formatLongDate } from '../home/homeLogic';
import { DetailTopBar } from './DetailTopBar';
import { MarkdownSheet } from './MarkdownSheet';
import { RelatedThoughtsSection } from './RelatedThoughtsSection';
import { SectionCard, SectionText } from './SectionCard';
import { StoryPreview } from './StoryPreview';
import {
  DEFAULT_SHARE_SELECTION,
  GOAL_IMPACT_LABELS,
  ShareSectionKey,
  buildStoryBlocks,
  notesOfDay,
  toggleSelection,
} from './detailLogic';

interface DailyDetailProps {
  daily: DailyDocument;
  /** Aktualne cele życiowe użytkownika (chipy w „Wpływ na cele”). */
  goals: string[];
  /** Nazwa osobowości AI w podpisie rady („Głos: …”). */
  voice: string;
  /** Wszystkie załadowane notatki; ekran pokazuje te z dnia wpisu. */
  notes: NoteDocument[];
  related: { items: RelatedThought[]; isLoading: boolean; error: string | null };
  onOpen: (documentId: string) => void;
}

const has = (value: string | null | undefined): value is string => !!value && value.trim().length > 0;

/** Wpis dnia: sekcje z briefu §2.6, tryb udostępniania (story 9:16) i podgląd pliku `.md`. */
export const DailyDetail: React.FC<DailyDetailProps> = ({ daily, goals, voice, notes, related, onOpen }) => {
  const { colors } = useTheme();
  const [shareMode, setShareMode] = useState(false);
  const [selection, setSelection] = useState<ShareSectionKey[]>(DEFAULT_SHARE_SELECTION);
  const [storyOpen, setStoryOpen] = useState(false);
  const [mdOpen, setMdOpen] = useState(false);

  const dayNotes = useMemo(() => notesOfDay(notes, daily.day), [notes, daily.day]);
  const storyBlocks = useMemo(() => buildStoryBlocks(daily, selection, voice), [daily, selection, voice]);

  const startShare = useCallback(() => {
    setSelection(DEFAULT_SHARE_SELECTION);
    setShareMode(true);
  }, []);
  const cancelShare = useCallback(() => setShareMode(false), []);
  const finishShare = useCallback(() => {
    if (storyBlocks.length === 0) {
      setShareMode(false);
      return;
    }
    setStoryOpen(true);
  }, [storyBlocks.length]);
  const closeStory = useCallback(() => {
    setStoryOpen(false);
    setShareMode(false);
  }, []);

  const card = (key: ShareSectionKey, label: string, children: React.ReactNode, labelNode?: React.ReactNode) => (
    <SectionCard
      key={key}
      label={label}
      labelNode={labelNode}
      selectable={shareMode}
      selected={selection.includes(key)}
      onToggle={() => setSelection((current) => toggleSelection(current, key))}
      sectionName={label}
    >
      {children}
    </SectionCard>
  );

  const emotionTriggers = daily.emotionTriggers || [];
  const emotions = daily.emotions || [];
  const quotes = daily.quotes || [];
  const completedTasks = daily.completedTasks || [];
  const importantEvents = daily.importantEvents || [];
  const ideas = daily.ideas || [];
  const tags = daily.tags || [];

  const emotionRows =
    emotionTriggers.length > 0
      ? emotionTriggers.map((e) => ({ name: e.emotion, trigger: e.trigger }))
      : emotions.map((name) => ({ name, trigger: '' }));
  const impactColor = GOAL_IMPACT_COLORS[daily.goalImpactType] ?? GOAL_IMPACT_COLORS.neutral;
  const s = pl.detail.sections;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <DetailTopBar
          shareMode={shareMode}
          selectedCount={selection.length}
          onShare={startShare}
          onOpenMarkdown={() => setMdOpen(true)}
          onCancelShare={cancelShare}
          onFinishShare={finishShare}
        />
        <Text style={[styles.date, { color: colors.textSecondary }]}>{formatLongDate(daily.day)}</Text>

        <View style={styles.stack}>
          {has(daily.dominantThought) || has(daily.summary) || quotes.length > 0
            ? card(
                'hero',
                s.hero,
                <View>
                  {has(daily.dominantThought) ? (
                    <GradientText text={daily.dominantThought} style={styles.dominant} />
                  ) : null}
                  {has(daily.summary) ? <SectionText>{daily.summary}</SectionText> : null}
                  {quotes.map((quote, index) => (
                    <View key={`${quote}-${index}`} style={styles.quote}>
                      <Text style={[styles.quoteMark, { color: colors.primary }]}>“</Text>
                      <Text style={[styles.quoteText, { color: colors.text }]}>{quote}</Text>
                    </View>
                  ))}
                </View>,
              )
            : null}

          {emotionRows.length > 0
            ? card(
                'emotions',
                s.emotions,
                <View style={styles.list}>
                  {emotionRows.map((row, index) => (
                    <View key={`${row.name}-${index}`} style={styles.emotionRow}>
                      <View style={[styles.pill, { backgroundColor: resolveEmotion(row.name).color }]}>
                        <Text style={styles.pillText}>{row.name}</Text>
                      </View>
                      {row.trigger ? (
                        <Text style={[styles.trigger, { color: colors.textSecondary }]}>{row.trigger}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>,
              )
            : null}

          {completedTasks.length > 0
            ? card(
                'done',
                s.done,
                <View style={styles.list}>
                  {completedTasks.map((task, index) => (
                    <View key={`${task}-${index}`} style={styles.listItem}>
                      <View style={[styles.okCircle, { backgroundColor: withAlpha(ACCENTS.success, 0.18) }]}>
                        <Feather name="check" size={13} color={ACCENTS.success} />
                      </View>
                      <Text style={[styles.itemText, { color: colors.text }]}>{task}</Text>
                    </View>
                  ))}
                </View>,
              )
            : null}

          {importantEvents.length > 0
            ? card(
                'events',
                s.events,
                <View style={styles.list}>
                  {importantEvents.map((event, index) => (
                    <View key={`${event}-${index}`} style={styles.listItem}>
                      <View style={styles.iconSlot}>
                        <Feather name="calendar" size={18} color={ACCENTS.sky} />
                      </View>
                      <Text style={[styles.itemText, { color: colors.text }]}>{event}</Text>
                    </View>
                  ))}
                </View>,
              )
            : null}

          {has(daily.impactOnGoals)
            ? card(
                'goals',
                s.goals,
                <View>
                  <Text style={[styles.itemText, { color: colors.text }]}>{daily.impactOnGoals}</Text>
                  {goals.length > 0 ? (
                    <View style={styles.chips}>
                      {goals.map((goal) => (
                        <Chip key={goal} label={goal} />
                      ))}
                    </View>
                  ) : null}
                </View>,
                <View style={styles.goalsHeader}>
                  <SectionLabel>{s.goals}</SectionLabel>
                  <View style={[styles.pill, { backgroundColor: impactColor }]}>
                    <Text style={styles.pillText}>{GOAL_IMPACT_LABELS[daily.goalImpactType]}</Text>
                  </View>
                </View>,
              )
            : null}

          {has(daily.goalAdvice)
            ? card(
                'advice',
                s.advice,
                <View>
                  <View style={styles.voice}>
                    <Feather name="message-circle" size={14} color={colors.primary} />
                    <Text style={[styles.voiceText, { color: colors.primary }]}>{pl.detail.voice(voice)}</Text>
                  </View>
                  <SectionText>{daily.goalAdvice}</SectionText>
                </View>,
              )
            : null}

          {has(daily.gratefulFor)
            ? card(
                'grateful',
                s.grateful,
                <View style={styles.listItem}>
                  <View style={styles.iconSlot}>
                    <Feather name="heart" size={18} color={ACCENTS.pink} />
                  </View>
                  <Text style={[styles.itemText, { color: colors.text }]}>{daily.gratefulFor}</Text>
                </View>,
              )
            : null}

          {card(
            'ideas',
            s.ideas,
            <View>
              {ideas.length === 0 ? (
                <Text style={[styles.noIdeas, { color: colors.textSecondary }]}>{pl.detail.noIdeas}</Text>
              ) : (
                ideas.map((idea) => (
                  <Pressable
                    key={idea.documentId}
                    onPress={shareMode ? undefined : () => onOpen(idea.documentId)}
                    accessibilityRole="button"
                    accessibilityLabel={idea.title}
                    style={[styles.idea, { backgroundColor: colors.card2, borderColor: colors.border }]}
                  >
                    <View style={[styles.ideaIcon, { backgroundColor: withAlpha(NOTE_TYPE_STYLE.idea.color, 0.18) }]}>
                      <Feather name="zap" size={16} color={NOTE_TYPE_STYLE.idea.color} />
                    </View>
                    <View style={styles.ideaText}>
                      <Text style={[styles.ideaTitle, { color: colors.text }]}>{idea.title}</Text>
                      {idea.oneLiner ? (
                        <Text style={[styles.ideaSub, { color: colors.textSecondary }]} numberOfLines={2}>
                          {idea.oneLiner}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))
              )}
            </View>,
          )}

          {tags.length > 0
            ? card(
                'keywords',
                s.keywords,
                <View style={styles.chips}>
                  {tags.map((tag) => (
                    <Chip key={tag} label={tag} />
                  ))}
                </View>,
              )
            : null}
        </View>

        <SectionLabel style={styles.label}>{pl.detail.dayNotes(dayNotes.length)}</SectionLabel>
        <GlassCard padding={0}>
          <View style={styles.dayNotes}>
            {dayNotes.map((note, index) => (
              <Pressable
                key={note.id}
                onPress={() => onOpen(note.id)}
                accessibilityRole="button"
                accessibilityLabel={note.title}
                style={[
                  styles.dayNote,
                  index < dayNotes.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                ]}
              >
                <View
                  style={[styles.dot, { backgroundColor: NOTE_TYPE_STYLE[note.noteType]?.color ?? colors.primary }]}
                />
                <Text style={[styles.dayNoteTitle, { color: colors.text }]} numberOfLines={1}>
                  {note.title}
                </Text>
                <Text style={[styles.dayNoteTime, { color: colors.textSecondary }]}>{formatClock(note.createdAt)}</Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        <RelatedThoughtsSection
          thoughts={related.items}
          isLoading={related.isLoading}
          error={related.error}
          onThoughtPress={onOpen}
          disabled={shareMode}
        />
      </ScrollView>

      <MarkdownSheet visible={mdOpen} markdown={daily.bodyMd} onClose={() => setMdOpen(false)} />
      <StoryPreview visible={storyOpen} day={daily.day} blocks={storyBlocks} onClose={closeStory} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 64 },
  date: { fontSize: 13, fontWeight: '600', marginBottom: 10, marginLeft: 2 },
  stack: { gap: 12 },
  dominant: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 29, marginBottom: 12 },
  quote: { flexDirection: 'row', gap: 8, marginTop: 12 },
  quoteMark: { fontSize: 30, lineHeight: 28, fontWeight: '800' },
  quoteText: { flex: 1, fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
  list: { gap: 8 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemText: { flex: 1, fontSize: 15, lineHeight: 21 },
  emotionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  pillText: { fontSize: 12, fontWeight: '700', color: PILL_TEXT },
  trigger: { flex: 1, fontSize: 13 },
  okCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconSlot: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  goalsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  voiceText: { fontSize: 12, fontWeight: '700' },
  noIdeas: { fontSize: 13, marginTop: 8 },
  idea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  ideaIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ideaText: { flex: 1, minWidth: 0 },
  ideaTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  ideaSub: { fontSize: 13, marginTop: 2 },
  label: { marginTop: 26, marginBottom: 10, marginLeft: 4 },
  dayNotes: { paddingHorizontal: 16, paddingVertical: 4 },
  dayNote: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dayNoteTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  dayNoteTime: { fontSize: 13 },
});
