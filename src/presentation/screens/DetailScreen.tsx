import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { DetailScreenRouteProp } from '../../navigation/types';
import { useDiaryStore } from '../../application/store/useDiaryStore';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { Feather, Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { GlassCard, GradientText, EmotionPill } from '../components/UIPrimitives';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const formatDate = (iso: string | Date | number) => {
  const d = new Date(iso);
  const days = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
  const months = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  return {
    weekday: days[d.getDay()],
    full: `${d.getDate()} ${months[d.getMonth()]}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
};

export const DetailScreen = () => {
  const route = useRoute<DetailScreenRouteProp>();
  const navigation = useNavigation();
  const { entries } = useDiaryStore();
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  const entry = entries.find(e => e.id === route.params.entryId);
  const compositeRef = useRef<View>(null);

  const [isShareMode, setIsShareMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);

  if (!entry || !entry.parsedData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Nie znaleziono wpisu lub brak analizy.</Text>
      </View>
    );
  }

  const { parsedData } = entry;
  const d = formatDate(entry.createdAt || entry.date);
  
  // Fallbacks for backward compatibility
  const pData = {
    dominantThought: parsedData.dominantThought || (parsedData as any).quote || "Wpis",
    summary: parsedData.summary || "",
    importantQuotes: parsedData.quotes || (parsedData as any).importantQuotes || (parsedData as any).important_quotes || [],
    impactOnGoals: parsedData.impactOnGoals || (parsedData as any).goalAlignment?.reason || "",
    tasksDone: parsedData.completedTasks || (parsedData as any).tasksDone || (parsedData as any).tasks_done || [],
    emotions: parsedData.emotions || [],
    fatigueLevel: parsedData.fatigueLevel || (parsedData as any).fatigue_level || "",
    stressVsCalm: parsedData.stressVsCalm || "",
    gratitude: parsedData.gratefulFor || (parsedData as any).gratitude || "",
    importantEvents: parsedData.importantEvents || [],
    angerTriggers: parsedData.triggeredAnger || (parsedData as any).angerTriggers || (parsedData as any).anger_triggers || "",
    joyTriggers: parsedData.triggeredJoy || (parsedData as any).joyTriggers || "",
    calmTriggers: parsedData.triggeredCalm || (parsedData as any).calmTriggers || "",
    stressTriggers: parsedData.triggeredStress || "",
    goalImpactType: parsedData.goalImpactType || 'neutral',
    goalAdvice: parsedData.goalAdvice || ""
  };

  const isValidData = (text: string | any) => {
    if (!text) return false;
    const str = String(text).toLowerCase().trim();
    if (str === '' || str === 'null' || str === 'brak' || str === 'nie dotyczy' || str === 'brak danych' || str === 'nie wspomniano') return false;
    return true;
  };

  const toggleSelection = (id: string) => {
    setSelectedCards(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
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
      const uri = await captureRef(compositeRef, {
        format: 'png',
        quality: 1,
      });
      await Sharing.shareAsync(uri);
      setIsShareMode(false);
      setSelectedCards([]);
    } catch (err) {
      console.error("Error sharing composite:", err);
    }
  };

  const isSelected = (id: string) => selectedCards.includes(id);

  const renderSelectableWrapper = (id: string, children: React.ReactNode, extraStyle?: any) => {
    const isWrapperSelectedStyle = isShareMode && isSelected(id);
    return (
      <TouchableOpacity 
        key={id}
        activeOpacity={isShareMode ? 0.7 : 1}
        onPress={isShareMode ? () => toggleSelection(id) : undefined}
        style={[styles.blockWrapper, isWrapperSelectedStyle && styles.selectedWrapper, extraStyle]}
      >
        {isShareMode && (
          <Ionicons 
            name={isSelected(id) ? "checkmark-circle" : "ellipse-outline"} 
            size={24} 
            color={isSelected(id) ? "#F472B6" : "rgba(255,255,255,0.4)"} 
            style={{ marginRight: 15 }} 
          />
        )}
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => isShareMode ? setIsShareMode(false) : navigation.goBack()} style={[styles.backButton, { borderColor: colors.tileBorder, backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)' }]}>
            {isShareMode ? (
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Anuluj</Text>
            ) : (
              <Feather name="chevron-left" size={20} color={colors.text} />
            )}
          </TouchableOpacity>
          {!isShareMode && (
            <View style={styles.headerTextContainer}>
              <Text style={[styles.weekdayText, { color: colors.text }]}>{d.weekday}</Text>
              <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>{d.full} · {d.time}</Text>
            </View>
          )}
          <TouchableOpacity onPress={handleShare} style={styles.headerAction}>
            {isShareMode ? (
              <Text style={styles.shareConfirmText}>Gotowe</Text>
            ) : (
              <View style={[styles.backButton, { backgroundColor: 'transparent', borderWidth: 0 }]}>
                <Ionicons name="share-outline" size={20} color={colors.text} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dashboard}>
          
          {/* THE HOOK: Summary */}
          {isValidData(pData.summary) ? renderSelectableWrapper('summary', 
            <GlassCard intensity={theme === 'AppleLight' ? 60 : 20} style={[styles.summaryCard, { backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' }]}>
              <Text style={[styles.summaryText, { color: colors.text }]}>{pData.summary}</Text>
            </GlassCard>
          ) : null}

          {/* THE STORY: Dominant Thought */}
          {pData.dominantThought ? renderSelectableWrapper('dominantThought', 
            <View style={styles.dominantThoughtContainer}>
              <GradientText 
                text={`"${pData.dominantThought}"`}
                colors={['#A78BFA', '#F472B6', '#60A5FA']} 
                style={styles.dominantThoughtText}
              />
            </View>
          ) : null}

          {/* EMOTIONS FELT */}
          {((pData.emotionTriggers && pData.emotionTriggers.length > 0) || (pData.emotions && pData.emotions.length > 0 && pData.emotions.every(isValidData))) ? renderSelectableWrapper('emotions', 
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Emocje</Text>
              <View style={styles.emotionsRow}>
                {pData.emotionTriggers && pData.emotionTriggers.length > 0 
                  ? pData.emotionTriggers.map((et, i) => <EmotionPill key={i} id={et.emotion} trigger={et.trigger} />)
                  : pData.emotions.map((e: string, i: number) => <EmotionPill key={i} id={e} />)
                }
              </View>
            </View>
          ) : null}

          {/* WHAT I DID TODAY */}
          {pData.tasksDone && pData.tasksDone.length > 0 && pData.tasksDone.every(isValidData) ? renderSelectableWrapper('tasks', 
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Zrobione zadania</Text>
              {pData.tasksDone.map((task: string, index: number) => (
                <View key={`task-${index}`} style={styles.taskItem}>
                  <Feather name="check-circle" size={16} color="#A78BFA" style={{ marginRight: 12, marginTop: 2 }} />
                  <Text style={[styles.taskText, { color: colors.text }]}>{task}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* IMPORTANT EVENTS */}
          {pData.importantEvents && pData.importantEvents.length > 0 && pData.importantEvents.every(isValidData) ? renderSelectableWrapper('events', 
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ważne wydarzenia</Text>
              {pData.importantEvents.map((event: string, index: number) => (
                <View key={`event-${index}`} style={styles.taskItem}>
                  <Feather name="star" size={16} color="#FBBF24" style={{ marginRight: 12, marginTop: 2 }} />
                  <Text style={[styles.taskText, { color: colors.text }]}>{event}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* GRATEFUL FOR */}
          {isValidData(pData.gratitude) ? renderSelectableWrapper('gratitude', 
            <GlassCard intensity={theme === 'AppleLight' ? 60 : 15} style={[styles.triggerCard, { borderColor: 'rgba(251, 191, 36, 0.2)', backgroundColor: 'rgba(251, 191, 36, 0.05)' }]}>
              <View style={styles.triggerHeader}>
                <Feather name="heart" size={16} color="#FBBF24" />
                <Text style={[styles.triggerTitle, { color: '#FBBF24' }]}>Za to jestem wdzięczny</Text>
              </View>
              <Text style={[styles.triggerText, { color: colors.text }]}>{pData.gratitude}</Text>
            </GlassCard>
          ) : null}

          {/* IMPACT ON GOALS */}
          {isValidData(pData.impactOnGoals) ? renderSelectableWrapper('impact', 
            <GlassCard intensity={theme === 'AppleLight' ? 60 : 15} style={[styles.triggerCard, { 
              borderColor: pData.goalImpactType === 'positive' ? 'rgba(74, 222, 128, 0.2)' : pData.goalImpactType === 'negative' ? 'rgba(248, 113, 113, 0.2)' : 'rgba(156, 163, 175, 0.2)',
              backgroundColor: pData.goalImpactType === 'positive' ? 'rgba(74, 222, 128, 0.05)' : pData.goalImpactType === 'negative' ? 'rgba(248, 113, 113, 0.05)' : 'rgba(156, 163, 175, 0.05)' 
            }]}>
              <View style={styles.triggerHeader}>
                <View style={{
                  width: 8, height: 8, borderRadius: 4, marginRight: 8,
                  backgroundColor: pData.goalImpactType === 'positive' ? '#4ADE80' : pData.goalImpactType === 'negative' ? '#F87171' : '#9CA3AF'
                }} />
                <Text style={[styles.triggerTitle, { color: pData.goalImpactType === 'positive' ? '#4ADE80' : pData.goalImpactType === 'negative' ? '#F87171' : '#9CA3AF' }]}>Wpływ na cele</Text>
              </View>
              <Text style={[styles.triggerText, { color: colors.text }]}>{pData.impactOnGoals}</Text>
            </GlassCard>
          ) : null}

          {/* KEY QUOTES */}
          {pData.importantQuotes && pData.importantQuotes.length > 0 && pData.importantQuotes.every(isValidData) ? (
            <View style={styles.quotesContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Najważniejsze słowa</Text>
              {pData.importantQuotes.map((quote: string, index: number) => 
                renderSelectableWrapper(`quote-${index}`, 
                  <View style={styles.blockquote}>
                    <View style={styles.blockquoteBar} />
                    <Text style={[styles.blockquoteText, { color: colors.text }]}>"{quote}"</Text>
                  </View>
                )
              )}
            </View>
          ) : null}

          {/* EMOTIONAL TRIGGERS */}
          <View style={styles.triggersContainer}>
            {isValidData(pData.joyTriggers) ? renderSelectableWrapper('joy', 
              <GlassCard intensity={theme === 'AppleLight' ? 60 : 15} style={[styles.triggerCard, { borderColor: 'rgba(74, 222, 128, 0.2)' }]}>
                <View style={styles.triggerHeader}>
                  <Feather name="smile" size={16} color="#4ADE80" />
                  <Text style={[styles.triggerTitle, { color: '#4ADE80' }]}>Wyzwoliło radość</Text>
                </View>
                <View style={styles.emotionsRow}>
                  {Array.isArray(pData.joyTriggers) 
                    ? pData.joyTriggers.map((t: string, i: number) => <EmotionPill key={`joy-${i}`} id={t} />)
                    : <EmotionPill id={pData.joyTriggers} />
                  }
                </View>
              </GlassCard>
            ) : null}

            {isValidData(pData.calmTriggers) ? renderSelectableWrapper('calm', 
              <GlassCard intensity={theme === 'AppleLight' ? 60 : 15} style={[styles.triggerCard, { borderColor: 'rgba(56, 189, 248, 0.2)' }]}>
                <View style={styles.triggerHeader}>
                  <Feather name="coffee" size={16} color="#38BDF8" />
                  <Text style={[styles.triggerTitle, { color: '#38BDF8' }]}>Wyzwoliło spokój</Text>
                </View>
                <View style={styles.emotionsRow}>
                  {Array.isArray(pData.calmTriggers) 
                    ? pData.calmTriggers.map((t: string, i: number) => <EmotionPill key={`calm-${i}`} id={t} />)
                    : <EmotionPill id={pData.calmTriggers} />
                  }
                </View>
              </GlassCard>
            ) : null}

            {isValidData(pData.stressTriggers) ? renderSelectableWrapper('stress', 
              <GlassCard intensity={theme === 'AppleLight' ? 60 : 15} style={[styles.triggerCard, { borderColor: 'rgba(251, 146, 60, 0.2)' }]}>
                <View style={styles.triggerHeader}>
                  <Feather name="activity" size={16} color="#FB923C" />
                  <Text style={[styles.triggerTitle, { color: '#FB923C' }]}>Wyzwoliło stres</Text>
                </View>
                <View style={styles.emotionsRow}>
                  {Array.isArray(pData.stressTriggers) 
                    ? pData.stressTriggers.map((t: string, i: number) => <EmotionPill key={`stress-${i}`} id={t} />)
                    : <EmotionPill id={pData.stressTriggers} />
                  }
                </View>
              </GlassCard>
            ) : null}

            {isValidData(pData.angerTriggers) ? renderSelectableWrapper('anger', 
              <GlassCard intensity={theme === 'AppleLight' ? 60 : 15} style={[styles.triggerCard, { borderColor: 'rgba(248, 113, 113, 0.2)' }]}>
                <View style={styles.triggerHeader}>
                  <Feather name="alert-triangle" size={16} color="#F87171" />
                  <Text style={[styles.triggerTitle, { color: '#F87171' }]}>Wyzwoliło złość</Text>
                </View>
                <View style={styles.emotionsRow}>
                  {Array.isArray(pData.angerTriggers) 
                    ? pData.angerTriggers.map((t: string, i: number) => <EmotionPill key={`anger-${i}`} id={t} />)
                    : <EmotionPill id={pData.angerTriggers} />
                  }
                </View>
              </GlassCard>
            ) : null}
          </View>

          {/* GOAL ADVICE */}
          {isValidData((pData as any).goalAdvice) ? renderSelectableWrapper('advice', 
            <GlassCard intensity={theme === 'AppleLight' ? 60 : 15} style={[styles.triggerCard, { borderColor: 'rgba(167, 139, 250, 0.2)', marginBottom: 20 }]}>
              <View style={styles.triggerHeader}>
                <Feather name="compass" size={16} color="#A78BFA" />
                <Text style={[styles.triggerTitle, { color: '#A78BFA' }]}>Rada oparta na twoich celach</Text>
              </View>
              <Text style={[styles.triggerText, { color: colors.text }]}>{(pData as any).goalAdvice}</Text>
            </GlassCard>
          ) : null}

          {/* THE RAW DATA (BOTTOM) */}
          <View style={[styles.divider, { backgroundColor: colors.tileBorder }]} />
          
          <TouchableOpacity 
            style={styles.transcriptAccordion} 
            activeOpacity={0.7}
            onPress={() => setIsTranscriptVisible(!isTranscriptVisible)}
          >
            <View style={styles.transcriptAccordionHeader}>
              <Feather name="file-text" size={18} color={colors.textSecondary} />
              <Text style={[styles.transcriptAccordionTitle, { color: colors.textSecondary }]}>Twój wpis</Text>
            </View>
            <Feather name={isTranscriptVisible ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          
          {isTranscriptVisible && (
            <View style={styles.transcriptContent}>
              <Text style={[styles.fullText, { color: colors.textSecondary }]}>{entry.fullText}</Text>
            </View>
          )}

        </View>
      </ScrollView>

      {/* OFF-SCREEN COMPOSITE RENDER */}
      <View 
        ref={compositeRef}
        collapsable={false}
        style={styles.compositeContainer}
      >
        <View style={styles.compositeInner}>
          {isSelected('dominantThought') && (
            <GradientText 
              text={`"${pData.dominantThought}"`}
              colors={['#A78BFA', '#F472B6', '#60A5FA']} 
              style={[styles.dominantThoughtText, { textAlign: 'center', marginBottom: 24 }]}
            />
          )}
          
          {isSelected('summary') && pData.summary && (
            <GlassCard intensity={20} style={[styles.summaryCard, { marginBottom: 24 }]}>
              <Text style={styles.summaryText}>{pData.summary}</Text>
            </GlassCard>
          )}

          {/* Simplified render for composite to avoid too much logic here, just matching styles */}
          
          {/* Watermark */}
          {selectedCards.length > 0 && (
            <View style={styles.watermarkContainer}>
              <Text style={styles.watermarkDate}>
                {new Date(entry.date).toLocaleDateString('pl-PL', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
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
  impactText: {
    fontSize: 16,
    lineHeight: 25,
    color: 'rgba(255,255,255,0.85)',
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
  triggersContainer: {
    gap: 12,
    marginTop: 8,
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
  }
});
