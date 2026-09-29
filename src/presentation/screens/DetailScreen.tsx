import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { DetailScreenRouteProp, DetailScreenNavigationProp } from '../../navigation/types';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { Feather, Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { GlassCard, GradientText, EmotionPill } from '../components/UIPrimitives';
import { getDocumentUseCase } from '../../composition';
import { AnyDocument } from '../../domain/repositories/IDocumentRepository';
import { getNoteTypeLabel, getNoteTypeColor, getNoteTypeIcon } from '../../domain/models/NoteDocument';

const { width } = Dimensions.get('window');

const formatDate = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const months = [
    'stycznia',
    'lutego',
    'marca',
    'kwietnia',
    'maja',
    'czerwca',
    'lipca',
    'sierpnia',
    'września',
    'października',
    'listopada',
    'grudnia',
  ];
  return {
    weekday: days[date.getDay()],
    full: `${date.getDate()} ${months[date.getMonth()]}`,
  };
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const hasContent = (text: string | null | undefined) => !!text && text.trim().length > 0;

export const DetailScreen = () => {
  const route = useRoute<DetailScreenRouteProp>();
  const navigation = useNavigation<DetailScreenNavigationProp>();
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  const compositeRef = useRef<View>(null);

  const [doc, setDoc] = useState<AnyDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isShareMode, setIsShareMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isMdPreviewVisible, setIsMdPreviewVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    getDocumentUseCase
      .execute(route.params.entryId)
      .then((result) => {
        if (!cancelled) setDoc(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route.params.entryId]);

  const toggleSelection = (id: string) => {
    setSelectedCards((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleShare = async () => {
    if (!isShareMode) {
      setIsShareMode(true);
      setSelectedCards(['dominantThought']);
      return;
    }
    if (selectedCards.length === 0) {
      setIsShareMode(false);
      return;
    }
    try {
      const uri = await captureRef(compositeRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri);
      setIsShareMode(false);
      setSelectedCards([]);
    } catch (err) {
      console.error('Error sharing composite:', err);
    }
  };

  const isSelected = (id: string) => selectedCards.includes(id);

  const renderSelectableWrapper = (id: string, children: React.ReactNode) => {
    const isWrapperSelectedStyle = isShareMode && isSelected(id);
    return (
      <TouchableOpacity
        key={id}
        activeOpacity={isShareMode ? 0.7 : 1}
        onPress={isShareMode ? () => toggleSelection(id) : undefined}
        style={[styles.blockWrapper, isWrapperSelectedStyle && styles.selectedWrapper]}
      >
        {isShareMode && (
          <Ionicons
            name={isSelected(id) ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isSelected(id) ? '#F472B6' : 'rgba(255,255,255,0.4)'}
            style={{ marginRight: 15 }}
          />
        )}
        <View style={{ flex: 1 }}>{children}</View>
      </TouchableOpacity>
    );
  };

  const renderHeader = (title: string, subtitle: string, canShare: boolean = true) => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => (isShareMode ? setIsShareMode(false) : navigation.goBack())}
        style={[
          styles.backButton,
          {
            borderColor: colors.tileBorder,
            backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
          },
        ]}
      >
        {isShareMode ? (
          <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Anuluj</Text>
        ) : (
          <Feather name="chevron-left" size={20} color={colors.text} />
        )}
      </TouchableOpacity>
      {!isShareMode && (
        <View style={styles.headerTextContainer}>
          <Text style={[styles.weekdayText, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>
      )}
      {canShare ? (
        <TouchableOpacity onPress={handleShare} style={styles.headerAction}>
          {isShareMode ? (
            <Text style={styles.shareConfirmText}>Gotowe</Text>
          ) : (
            <View style={[styles.backButton, { backgroundColor: 'transparent', borderWidth: 0 }]}>
              <Ionicons name="share-outline" size={20} color={colors.text} />
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (loadError || !doc) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={styles.errorText}>{loadError || 'Nie znaleziono wpisu.'}</Text>
      </View>
    );
  }

  if (doc.kind === 'note') {
    const note = doc;
    const typeColor = getNoteTypeColor(note.noteType);
    const d = formatDate(note.day);

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderHeader(d.weekday, `${d.full} · ${formatTime(note.createdAt)}`, false)}
          <View style={styles.dashboard}>
            <View style={styles.noteTypeBadgeRow}>
              <View style={[styles.noteTypeBadge, { backgroundColor: `${typeColor}22`, borderColor: typeColor }]}>
                <Feather name={getNoteTypeIcon(note.noteType) as any} size={14} color={typeColor} />
                <Text style={[styles.noteTypeBadgeText, { color: typeColor }]}>{getNoteTypeLabel(note.noteType)}</Text>
              </View>
              {note.categoryName ? (
                <Text style={[styles.noteCategory, { color: colors.textSecondary }]}>{note.categoryName}</Text>
              ) : null}
            </View>

            <Text style={[styles.dominantThoughtText, { color: colors.text, textAlign: 'left', fontSize: 24 }]}>
              {note.title}
            </Text>

            <GlassCard intensity={theme === 'AppleLight' ? 60 : 20} style={styles.summaryCard}>
              <Text style={[styles.summaryText, { color: colors.text }]}>{note.content}</Text>
            </GlassCard>

            {note.tags.length > 0 && (
              <View style={styles.emotionsRow}>
                {note.tags.map((tag) => (
                  <EmotionPill key={tag} id={tag} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  const daily = doc;
  const d = formatDate(daily.day);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderHeader(d.weekday, d.full)}

        <View style={styles.dashboard}>
          {hasContent(daily.summary) &&
            renderSelectableWrapper(
              'summary',
              <GlassCard
                intensity={theme === 'AppleLight' ? 60 : 20}
                style={[
                  styles.summaryCard,
                  { backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' },
                ]}
              >
                <Text style={[styles.summaryText, { color: colors.text }]}>{daily.summary}</Text>
              </GlassCard>,
            )}

          {hasContent(daily.dominantThought) &&
            renderSelectableWrapper(
              'dominantThought',
              <View style={styles.dominantThoughtContainer}>
                <GradientText
                  text={`"${daily.dominantThought}"`}
                  colors={['#A78BFA', '#F472B6', '#60A5FA']}
                  style={styles.dominantThoughtText}
                />
              </View>,
            )}

          {(daily.emotionTriggers.length > 0 || daily.emotions.length > 0) &&
            renderSelectableWrapper(
              'emotions',
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Emocje</Text>
                <View style={styles.emotionsRow}>
                  {daily.emotionTriggers.length > 0
                    ? daily.emotionTriggers.map((et, i) => <EmotionPill key={i} id={et.emotion} trigger={et.trigger} />)
                    : daily.emotions.map((e, i) => <EmotionPill key={i} id={e} />)}
                </View>
              </View>,
            )}

          {daily.ideas.length > 0 &&
            renderSelectableWrapper(
              'ideas',
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>💡 Pomysły, na które wpadłem</Text>
                {daily.ideas.map((idea) => (
                  <TouchableOpacity
                    key={idea.documentId}
                    style={styles.ideaItem}
                    activeOpacity={0.7}
                    disabled={isShareMode}
                    onPress={() => navigation.push('Detail', { entryId: idea.documentId })}
                  >
                    <Feather name="zap" size={16} color="#FBBF24" style={{ marginRight: 12, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ideaTitle, { color: colors.text }]}>{idea.title}</Text>
                      <Text style={[styles.ideaOneLiner, { color: colors.textSecondary }]}>{idea.oneLiner}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>,
            )}

          {daily.completedTasks.length > 0 &&
            renderSelectableWrapper(
              'tasks',
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Zrobione</Text>
                {daily.completedTasks.map((task, index) => (
                  <View key={`task-${index}`} style={styles.taskItem}>
                    <Feather name="check-circle" size={16} color="#A78BFA" style={{ marginRight: 12, marginTop: 2 }} />
                    <Text style={[styles.taskText, { color: colors.text }]}>{task}</Text>
                  </View>
                ))}
              </View>,
            )}

          {daily.importantEvents.length > 0 &&
            renderSelectableWrapper(
              'events',
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ważne wydarzenia</Text>
                {daily.importantEvents.map((event, index) => (
                  <View key={`event-${index}`} style={styles.taskItem}>
                    <Feather name="star" size={16} color="#FBBF24" style={{ marginRight: 12, marginTop: 2 }} />
                    <Text style={[styles.taskText, { color: colors.text }]}>{event}</Text>
                  </View>
                ))}
              </View>,
            )}

          {hasContent(daily.gratefulFor) &&
            renderSelectableWrapper(
              'gratitude',
              <GlassCard
                intensity={theme === 'AppleLight' ? 60 : 15}
                style={[
                  styles.triggerCard,
                  { borderColor: 'rgba(251, 191, 36, 0.2)', backgroundColor: 'rgba(251, 191, 36, 0.05)' },
                ]}
              >
                <View style={styles.triggerHeader}>
                  <Feather name="heart" size={16} color="#FBBF24" />
                  <Text style={[styles.triggerTitle, { color: '#FBBF24' }]}>Za to jestem wdzięczny</Text>
                </View>
                <Text style={[styles.triggerText, { color: colors.text }]}>{daily.gratefulFor}</Text>
              </GlassCard>,
            )}

          {hasContent(daily.impactOnGoals) &&
            renderSelectableWrapper(
              'impact',
              <GlassCard
                intensity={theme === 'AppleLight' ? 60 : 15}
                style={[
                  styles.triggerCard,
                  {
                    borderColor:
                      daily.goalImpactType === 'positive'
                        ? 'rgba(74, 222, 128, 0.2)'
                        : daily.goalImpactType === 'negative'
                          ? 'rgba(248, 113, 113, 0.2)'
                          : 'rgba(156, 163, 175, 0.2)',
                    backgroundColor:
                      daily.goalImpactType === 'positive'
                        ? 'rgba(74, 222, 128, 0.05)'
                        : daily.goalImpactType === 'negative'
                          ? 'rgba(248, 113, 113, 0.05)'
                          : 'rgba(156, 163, 175, 0.05)',
                  },
                ]}
              >
                <View style={styles.triggerHeader}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      marginRight: 8,
                      backgroundColor:
                        daily.goalImpactType === 'positive'
                          ? '#4ADE80'
                          : daily.goalImpactType === 'negative'
                            ? '#F87171'
                            : '#9CA3AF',
                    }}
                  />
                  <Text
                    style={[
                      styles.triggerTitle,
                      {
                        color:
                          daily.goalImpactType === 'positive'
                            ? '#4ADE80'
                            : daily.goalImpactType === 'negative'
                              ? '#F87171'
                              : '#9CA3AF',
                      },
                    ]}
                  >
                    Wpływ na cele
                  </Text>
                </View>
                <Text style={[styles.triggerText, { color: colors.text }]}>{daily.impactOnGoals}</Text>
              </GlassCard>,
            )}

          {daily.quotes.length > 0 && (
            <View style={styles.quotesContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Najważniejsze słowa</Text>
              {daily.quotes.map((quote, index) =>
                renderSelectableWrapper(
                  `quote-${index}`,
                  <View style={styles.blockquote}>
                    <View style={styles.blockquoteBar} />
                    <Text style={[styles.blockquoteText, { color: colors.text }]}>&quot;{quote}&quot;</Text>
                  </View>,
                ),
              )}
            </View>
          )}

          {hasContent(daily.goalAdvice) &&
            renderSelectableWrapper(
              'advice',
              <GlassCard
                intensity={theme === 'AppleLight' ? 60 : 15}
                style={[styles.triggerCard, { borderColor: 'rgba(167, 139, 250, 0.2)', marginBottom: 20 }]}
              >
                <View style={styles.triggerHeader}>
                  <Feather name="compass" size={16} color="#A78BFA" />
                  <Text style={[styles.triggerTitle, { color: '#A78BFA' }]}>Rada oparta na twoich celach</Text>
                </View>
                <Text style={[styles.triggerText, { color: colors.text }]}>{daily.goalAdvice}</Text>
              </GlassCard>,
            )}

          {/* PODGLĄD .MD */}
          <View style={[styles.divider, { backgroundColor: colors.tileBorder }]} />
          <TouchableOpacity
            style={styles.transcriptAccordion}
            activeOpacity={0.7}
            onPress={() => setIsMdPreviewVisible(!isMdPreviewVisible)}
          >
            <View style={styles.transcriptAccordionHeader}>
              <Feather name="file-text" size={18} color={colors.textSecondary} />
              <Text style={[styles.transcriptAccordionTitle, { color: colors.textSecondary }]}>Podgląd pliku .md</Text>
            </View>
            <Feather name={isMdPreviewVisible ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {isMdPreviewVisible && (
            <View style={styles.transcriptContent}>
              <Text style={[styles.fullText, { color: colors.textSecondary }]}>{daily.bodyMd}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* OFF-SCREEN COMPOSITE RENDER: karta do udostępnienia, dokładnie z documents.data bieżącego
          wpisu dnia — pokazuje dowolną kombinację sekcji, które użytkownik zaznaczył w trybie
          udostępniania (te same id co renderSelectableWrapper w panelu powyżej). */}
      <View ref={compositeRef} collapsable={false} style={styles.compositeContainer}>
        <View style={styles.compositeInner}>
          {isSelected('dominantThought') && hasContent(daily.dominantThought) && (
            <GradientText
              text={`"${daily.dominantThought}"`}
              colors={['#A78BFA', '#F472B6', '#60A5FA']}
              style={[styles.dominantThoughtText, { textAlign: 'center', marginBottom: 24 }]}
            />
          )}

          {isSelected('summary') && hasContent(daily.summary) && (
            <GlassCard intensity={20} style={[styles.summaryCard, { marginBottom: 24 }]}>
              <Text style={styles.summaryText}>{daily.summary}</Text>
            </GlassCard>
          )}

          {isSelected('emotions') && (daily.emotionTriggers.length > 0 || daily.emotions.length > 0) && (
            <View style={[styles.sectionContainer, { marginBottom: 24 }]}>
              <Text style={styles.compositeSectionTitle}>Emocje</Text>
              <View style={styles.emotionsRow}>
                {daily.emotionTriggers.length > 0
                  ? daily.emotionTriggers.map((et, i) => <EmotionPill key={i} id={et.emotion} trigger={et.trigger} />)
                  : daily.emotions.map((e, i) => <EmotionPill key={i} id={e} />)}
              </View>
            </View>
          )}

          {isSelected('ideas') && daily.ideas.length > 0 && (
            <View style={[styles.sectionContainer, { marginBottom: 24 }]}>
              <Text style={styles.compositeSectionTitle}>💡 Pomysły, na które wpadłem</Text>
              {daily.ideas.map((idea) => (
                <Text key={idea.documentId} style={styles.compositeBodyText}>
                  • {idea.title} — {idea.oneLiner}
                </Text>
              ))}
            </View>
          )}

          {isSelected('tasks') && daily.completedTasks.length > 0 && (
            <View style={[styles.sectionContainer, { marginBottom: 24 }]}>
              <Text style={styles.compositeSectionTitle}>Zrobione</Text>
              {daily.completedTasks.map((task, index) => (
                <Text key={`c-task-${index}`} style={styles.compositeBodyText}>
                  • {task}
                </Text>
              ))}
            </View>
          )}

          {isSelected('events') && daily.importantEvents.length > 0 && (
            <View style={[styles.sectionContainer, { marginBottom: 24 }]}>
              <Text style={styles.compositeSectionTitle}>Ważne wydarzenia</Text>
              {daily.importantEvents.map((event, index) => (
                <Text key={`c-event-${index}`} style={styles.compositeBodyText}>
                  • {event}
                </Text>
              ))}
            </View>
          )}

          {isSelected('gratitude') && hasContent(daily.gratefulFor) && (
            <GlassCard
              intensity={15}
              style={[styles.triggerCard, { borderColor: 'rgba(251, 191, 36, 0.2)', marginBottom: 24 }]}
            >
              <View style={styles.triggerHeader}>
                <Feather name="heart" size={16} color="#FBBF24" />
                <Text style={[styles.triggerTitle, { color: '#FBBF24' }]}>Za to jestem wdzięczny</Text>
              </View>
              <Text style={styles.compositeBodyText}>{daily.gratefulFor}</Text>
            </GlassCard>
          )}

          {isSelected('impact') && hasContent(daily.impactOnGoals) && (
            <GlassCard intensity={15} style={[styles.triggerCard, { marginBottom: 24 }]}>
              <View style={styles.triggerHeader}>
                <Text style={[styles.triggerTitle, { color: colors.text }]}>Wpływ na cele</Text>
              </View>
              <Text style={styles.compositeBodyText}>{daily.impactOnGoals}</Text>
            </GlassCard>
          )}

          {daily.quotes.map(
            (quote, index) =>
              isSelected(`quote-${index}`) && (
                <View key={`c-quote-${index}`} style={[styles.blockquote, { marginBottom: 24 }]}>
                  <View style={styles.blockquoteBar} />
                  <Text style={[styles.blockquoteText, { color: '#fff' }]}>&quot;{quote}&quot;</Text>
                </View>
              ),
          )}

          {isSelected('advice') && hasContent(daily.goalAdvice) && (
            <GlassCard
              intensity={15}
              style={[styles.triggerCard, { borderColor: 'rgba(167, 139, 250, 0.2)', marginBottom: 24 }]}
            >
              <View style={styles.triggerHeader}>
                <Feather name="compass" size={16} color="#A78BFA" />
                <Text style={[styles.triggerTitle, { color: '#A78BFA' }]}>Rada oparta na twoich celach</Text>
              </View>
              <Text style={styles.compositeBodyText}>{daily.goalAdvice}</Text>
            </GlassCard>
          )}

          {selectedCards.length > 0 && (
            <View style={styles.watermarkContainer}>
              <Text style={styles.watermarkDate}>{d.full}</Text>
              <Text style={styles.watermarkText}>Wygenerowano w Mój Pamiętnik AI</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 64,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
  headerTextContainer: {
    marginLeft: 12,
  },
  weekdayText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateTimeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  headerAction: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  cancelText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  shareConfirmText: {
    color: '#F472B6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dashboard: {
    gap: 24,
  },
  blockWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedWrapper: {
    borderWidth: 2,
    borderColor: '#F472B6',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 10,
    borderRadius: 20,
    marginHorizontal: -12,
  },
  summaryCard: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.85)',
  },
  dominantThoughtContainer: {
    paddingVertical: 12,
  },
  dominantThoughtText: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 36,
    textAlign: 'center',
  },
  sectionContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emotionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskText: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  ideaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  ideaTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  ideaOneLiner: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  noteTypeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noteTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteCategory: {
    fontSize: 13,
  },
  quotesContainer: {
    marginTop: 8,
  },
  blockquote: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  blockquoteBar: {
    width: 3,
    backgroundColor: '#F472B6',
    borderRadius: 2,
    marginRight: 16,
  },
  blockquoteText: {
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 28,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  triggerCard: {
    padding: 16,
    borderWidth: 1,
  },
  triggerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  triggerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  triggerText: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.85)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  transcriptAccordion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  transcriptAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transcriptAccordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  transcriptContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  fullText: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.4)',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 100,
  },
  compositeContainer: {
    position: 'absolute',
    left: -9999,
    width: width * 0.9,
  },
  compositeInner: {
    backgroundColor: '#111827',
    padding: 24,
    borderRadius: 24,
    gap: 24,
  },
  compositeSectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  compositeBodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  watermarkContainer: {
    alignItems: 'center',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 20,
  },
  watermarkDate: {
    color: '#E2E8F0',
    fontSize: 14,
    opacity: 0.5,
    marginBottom: 4,
  },
  watermarkText: {
    color: '#94A3B8',
    fontSize: 12,
    opacity: 0.4,
  },
});
