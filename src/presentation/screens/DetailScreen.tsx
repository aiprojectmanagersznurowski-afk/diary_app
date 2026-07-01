import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRoute, useNavigation } from '@react-navigation/native';
import { DetailScreenRouteProp } from '../../navigation/types';
import { useDiaryStore } from '../../application/store/useDiaryStore';
import { Feather, Ionicons } from '@expo/vector-icons';
import { GradientText } from '../components/GradientText';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';

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

  if (!entry || !entry.parsedData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Nie znaleziono wpisu lub brak analizy.</Text>
      </View>
    );
  }

  const { parsedData } = entry;

  const getGoalColor = (status: string) => {
    switch (status) {
      case 'POSITIVE': return '#4ADE80';
      case 'NEGATIVE': return '#F87171';
      default: return '#94A3B8';
    }
  };

  const getGoalIcon = (status: string) => {
    switch (status) {
      case 'POSITIVE': return 'arrow-up-circle';
      case 'NEGATIVE': return 'arrow-down-circle';
      default: return 'minus-circle';
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedCards(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleShare = async () => {
    if (!isShareMode) {
      setIsShareMode(true);
      // Domyślnie zaznaczamy główny cytat
      setSelectedCards(['main_quote']);
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

  // Build the interleaved blocks
  const blocks: any[] = [];
  const lists: any[] = [];

  lists.push({ type: 'emotions', id: 'emotions_fatigue' });

  if (parsedData.tasks_done?.length) {
    lists.push({ type: 'list', id: 'tasks', title: 'Wykonane zadania', icon: 'check-square', items: parsedData.tasks_done });
  }
  if (parsedData.gratitude?.length) {
    lists.push({ type: 'list', id: 'gratitude', title: 'Wdzięczność za', icon: 'heart', items: parsedData.gratitude });
  }
  if (parsedData.anger_triggers?.length) {
    lists.push({ type: 'list', id: 'anger', title: 'Wyzwalacze złości', icon: 'alert-triangle', items: parsedData.anger_triggers });
  }

  const quotes = parsedData.important_quotes || [];
  let quoteIndex = 0;

  for (let i = 0; i < lists.length; i++) {
    if (quoteIndex < quotes.length) {
      blocks.push({ type: 'quote', id: `quote-${quoteIndex}`, text: quotes[quoteIndex] });
      quoteIndex++;
    }
    blocks.push(lists[i]);
  }

  while (quoteIndex < quotes.length) {
    blocks.push({ type: 'quote', id: `quote-${quoteIndex}`, text: quotes[quoteIndex] });
    quoteIndex++;
  }

  const renderBlock = (block: any, inComposite: boolean = false) => {
    const isSelected = selectedCards.includes(block.id);
    if (inComposite && !isSelected) return null;

    const Wrapper = inComposite ? View : TouchableOpacity;
    const wrapperProps = inComposite ? {} : {
      activeOpacity: isShareMode ? 0.7 : 1,
      onPress: isShareMode ? () => toggleSelection(block.id) : undefined,
    };

    if (block.type === 'quote') {
      return (
        <Wrapper key={block.id} {...wrapperProps} style={[styles.blockWrapper, !inComposite && isShareMode && isSelected && styles.selectedWrapper]}>
          {isShareMode && !inComposite && (
            <View style={styles.selectionIndicator}>
              <Ionicons name={isSelected ? "checkmark-circle" : "ellipse-outline"} size={24} color={isSelected ? "#A78BFA" : "#94A3B8"} />
            </View>
          )}
          <GradientText colors={colors.gradientColors} style={[styles.importantQuoteText, { textAlign: 'center' }, inComposite && { marginBottom: 15 }]}>
            "{block.text}"
          </GradientText>
        </Wrapper>
      );
    }

    if (block.type === 'emotions') {
      return (
        <Wrapper key={block.id} {...wrapperProps} style={[styles.blockWrapper, !inComposite && isShareMode && isSelected && styles.selectedWrapper]}>
          <View style={styles.row}>
            <BlurView intensity={20} tint={colors.tileTint} style={[styles.tile, styles.halfTile, { borderColor: colors.tileBorder }]}>
              <View style={[styles.tileHeader, { justifyContent: 'center' }]}>
                <Feather name="smile" size={16} color={colors.text} />
                <Text style={[styles.tileTitleSmall, { color: colors.text }]}>Emocje</Text>
              </View>
              <Text style={[styles.tagText, { color: colors.text, textAlign: 'center' }]}>{parsedData.emotions?.join(', ') || 'Brak'}</Text>
            </BlurView>

            <BlurView intensity={20} tint={colors.tileTint} style={[styles.tile, styles.halfTile, { borderColor: colors.tileBorder }]}>
              <View style={[styles.tileHeader, { justifyContent: 'center' }]}>
                <Feather name="battery" size={16} color={colors.text} />
                <Text style={[styles.tileTitleSmall, { color: colors.text }]}>Zmęczenie</Text>
              </View>
              <Text style={[styles.tagText, { color: colors.text, textAlign: 'center' }]}>{parsedData.fatigue_level || 'Brak'}</Text>
            </BlurView>
          </View>
          {isShareMode && !inComposite && (
            <View style={styles.selectionIndicatorAbs}>
              <Ionicons name={isSelected ? "checkmark-circle" : "ellipse-outline"} size={24} color={isSelected ? "#A78BFA" : "#94A3B8"} />
            </View>
          )}
        </Wrapper>
      );
    }

    if (block.type === 'list') {
      return (
        <Wrapper key={block.id} {...wrapperProps} style={[styles.blockWrapper, !inComposite && isShareMode && isSelected && styles.selectedWrapper]}>
          <BlurView intensity={20} tint={colors.tileTint} style={[styles.tile, { borderColor: colors.tileBorder }]}>
            <View style={[styles.tileHeader, { justifyContent: 'space-between' }]}>
              <View style={[styles.tileHeaderLeft, { flex: 1, justifyContent: 'center' }]}>
                <Feather name={block.icon} size={20} color={colors.text} />
                <Text style={[styles.tileTitle, { color: colors.text, textAlign: 'center' }]}>{block.title}</Text>
              </View>
              {isShareMode && !inComposite && (
                <Ionicons name={isSelected ? "checkmark-circle" : "ellipse-outline"} size={24} color={isSelected ? colors.primary : colors.textSecondary} />
              )}
            </View>
            {block.items.map((item: string, index: number) => (
              <View key={index} style={[styles.listItem, { justifyContent: 'center' }]}>
                <View style={[styles.bullet, { backgroundColor: colors.textSecondary }]} />
                <Text style={[styles.listText, { color: colors.text, textAlign: 'center', flex: 0 }]}>{item}</Text>
              </View>
            ))}
          </BlurView>
        </Wrapper>
      );
    }
  };

  const isMainQuoteSelected = selectedCards.includes('main_quote');
  const isGoalSelected = selectedCards.includes('goal');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => isShareMode ? setIsShareMode(false) : navigation.goBack()} style={styles.backButton}>
            {isShareMode ? (
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Anuluj</Text>
            ) : (
              <Feather name="chevron-left" size={28} color={colors.text} />
            )}
          </TouchableOpacity>
          {!isShareMode && (
            <Text style={[styles.dateText, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>
              {new Date(entry.date).toLocaleDateString('pl-PL', { 
                weekday: 'long', month: 'long', day: 'numeric' 
              })}
            </Text>
          )}
          <TouchableOpacity onPress={handleShare} style={styles.headerAction}>
            {isShareMode ? (
              <Text style={[styles.shareConfirmText, { color: colors.primary }]}>Udostępnij</Text>
            ) : (
              <Ionicons name="logo-instagram" size={24} color={colors.text} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          activeOpacity={isShareMode ? 0.7 : 1}
          onPress={isShareMode ? () => toggleSelection('main_quote') : undefined}
          style={[styles.mainQuoteWrapper, !isShareMode ? { marginBottom: 30 } : { marginBottom: 24 }, isShareMode && isMainQuoteSelected && [styles.selectedWrapper, { borderColor: colors.primary }]]}
        >
          {isShareMode && (
            <View style={styles.selectionIndicator}>
              <Ionicons name={isMainQuoteSelected ? "checkmark-circle" : "ellipse-outline"} size={24} color={isMainQuoteSelected ? colors.primary : colors.textSecondary} />
            </View>
          )}
          <GradientText colors={colors.gradientColors} style={[styles.quoteText, { textAlign: 'center' }]}>
            "{parsedData.quote}"
          </GradientText>
        </TouchableOpacity>

        <View style={styles.dashboard}>
          <TouchableOpacity
            activeOpacity={isShareMode ? 0.7 : 1}
            onPress={isShareMode ? () => toggleSelection('goal') : undefined}
            style={[styles.blockWrapper, isShareMode && isGoalSelected && [styles.selectedWrapper, { borderColor: colors.primary }]]}
          >
            <BlurView intensity={20} tint={colors.tileTint} style={[styles.tile, styles.goalTile, { borderColor: colors.tileBorder }]}>
              <View style={[styles.tileHeader, { justifyContent: 'space-between' }]}>
                <View style={[styles.tileHeaderLeft, { flex: 1, justifyContent: 'center' }]}>
                  <Feather name="target" size={20} color={colors.text} />
                  <Text style={[styles.tileTitle, { color: colors.text, textAlign: 'center' }]}>Wpływ na cele</Text>
                </View>
                {isShareMode && (
                  <Ionicons name={isGoalSelected ? "checkmark-circle" : "ellipse-outline"} size={24} color={isGoalSelected ? colors.primary : colors.textSecondary} />
                )}
              </View>
              <View style={[styles.goalStatusContainer, { justifyContent: 'center' }]}>
                <Feather name={getGoalIcon(parsedData.goal_alignment.status)} size={24} color={getGoalColor(parsedData.goal_alignment.status)} />
                <Text style={[styles.goalStatus, { color: getGoalColor(parsedData.goal_alignment.status), textAlign: 'center' }]}>
                  {parsedData.goal_alignment.status}
                </Text>
              </View>
              <Text style={[styles.goalReason, { color: colors.textSecondary, textAlign: 'center' }]}>{parsedData.goal_alignment.reason}</Text>
            </BlurView>
          </TouchableOpacity>

          {blocks.map(block => renderBlock(block))}

          <BlurView intensity={20} tint={colors.tileTint} style={[styles.tile, { borderColor: colors.tileBorder }]}>
            <View style={[styles.tileHeader, { marginBottom: 15, justifyContent: 'center' }]}>
              <Feather name="file-text" size={20} color={colors.text} style={{ marginRight: 10 }} />
              <Text style={[styles.tileTitle, { color: colors.text }]}>Pełny wpis</Text>
            </View>
            <Text style={[styles.fullText, { color: colors.textSecondary, textAlign: 'center' }]}>{entry.fullText}</Text>
          </BlurView>
        </View>
      </ScrollView>

      {/* OFF-SCREEN COMPOSITE RENDER */}
      <View 
        ref={compositeRef}
        collapsable={false}
        style={styles.compositeContainer}
      >
        <View style={styles.compositeInner}>
          {isMainQuoteSelected && (
            <GradientText colors={colors.gradientColors} style={[styles.quoteText, { textAlign: 'center', marginBottom: 24 }]}>
              "{parsedData.quote}"
            </GradientText>
          )}

          {isGoalSelected && (
            <BlurView intensity={40} tint="dark" style={[styles.tile, styles.goalTile, { marginBottom: 24 }]}>
              <View style={[styles.tileHeader, { justifyContent: 'center' }]}>
                <Feather name="target" size={20} color="#E2E8F0" style={{marginRight: 10}} />
                <Text style={styles.tileTitle}>Wpływ na cele</Text>
              </View>
              <View style={[styles.goalStatusContainer, { justifyContent: 'center' }]}>
                <Feather name={getGoalIcon(parsedData.goal_alignment.status)} size={24} color={getGoalColor(parsedData.goal_alignment.status)} />
                <Text style={[styles.goalStatus, { color: getGoalColor(parsedData.goal_alignment.status), textAlign: 'center' }]}>
                  {parsedData.goal_alignment.status}
                </Text>
              </View>
              <Text style={[styles.goalReason, { textAlign: 'center' }]}>{parsedData.goal_alignment.reason}</Text>
            </BlurView>
          )}

          {blocks.map(block => renderBlock(block, true))}

          {/* Watermark */}
          {selectedCards.length > 0 && (
            <View style={styles.watermarkContainer}>
              <Text style={styles.watermarkDate}>
                {new Date(entry.date).toLocaleDateString('pl-PL', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              <Text style={styles.watermarkText}>Wygenerowano w moim inteligentnym pamiętniku</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const width = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backButton: {
    minWidth: 60,
  },
  headerAction: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 18,
  },
  shareConfirmText: {
    color: '#A78BFA',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 16,
    textTransform: 'capitalize',
  },
  mainQuoteWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: -10,
    borderRadius: 16,
  },
  quoteText: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    flex: 1,
  },
  importantQuoteText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    flex: 1,
    padding: 10,
  },
  dashboard: {
    gap: 24, // Zwiększone światło
  },
  blockWrapper: {
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedWrapper: {
    borderWidth: 2,
    borderColor: '#A78BFA',
    backgroundColor: 'rgba(167, 139, 250, 0.05)',
  },
  selectionIndicator: {
    marginRight: 15,
  },
  selectionIndicatorAbs: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 15,
    flex: 1,
  },
  tile: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    flex: 1,
  },
  goalTile: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  halfTile: {
    flex: 1,
    padding: 15,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tileTitle: {
    color: '#E2E8F0',
    fontSize: 18,
    fontWeight: '600',
  },
  tileTitleSmall: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  goalStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  goalStatus: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  goalReason: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
  },
  tagText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
    marginTop: 8,
    marginRight: 12,
  },
  listText: {
    color: '#E2E8F0',
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  fullText: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 24,
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
    backgroundColor: '#111827', // Głębszy grafit jako ciemne tło (Tailwind gray-900)
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
