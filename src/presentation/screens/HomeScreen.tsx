import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDiaryStore } from '../../application/store/useDiaryStore';
import { useNotesStore } from '../../application/store/useNotesStore';
import { useAuthStore } from '../../application/store/useAuthStore';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { getAnalyticsData, getWeeklyCalmPercentage } from '../../application/useCases/statsUseCase';
import { Feather } from '@expo/vector-icons';
import { GlassCard, GradientText, EmotionPill } from '../components/UIPrimitives';
import { BadgeAlertModal } from '../components/BadgeAlertModal';
import { RecordingOverlay } from '../components/RecordingOverlay';
import { RecordingStatusList } from '../components/RecordingStatusList';
import { NotesList } from '../components/NotesList';
import { LinearGradient } from 'expo-linear-gradient';

const formatDate = (iso: string | Date | number) => {
  const d = new Date(iso);
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
    weekday: days[d.getDay()],
    full: `${d.getDate()} ${months[d.getMonth()]}`,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
};

export const HomeScreen = () => {
  const {
    entries,
    isLoading: isDiaryLoading,
    isRecording,
    isProcessing,
    error: diaryError,
    fetchEntries,
    startRecording,
    stopRecordingAndProcess,
  } = useDiaryStore();

  const {
    recordings,
    notes,
    activeFilter,
    isLoadingNotes,
    error: notesError,
    setFilter,
    fetchRecordings,
    fetchNotes,
    retryRecording,
    subscribeToRealtime,
  } = useNotesStore();

  const { user } = useAuthStore();
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<'entries' | 'notes'>('entries');

  const calmPercentage = getWeeklyCalmPercentage(entries);
  const { calm: calmData } = getAnalyticsData(entries, 7);

  useEffect(() => {
    fetchEntries();
    fetchRecordings();
    fetchNotes();

    if (user?.id) {
      const unsubscribe = subscribeToRealtime(user.id);
      return () => {
        unsubscribe();
      };
    }
  }, [user?.id, fetchEntries, fetchRecordings, fetchNotes, subscribeToRealtime]);

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecordingAndProcess();
      // Po zakończeniu nagrania odśwież listę nagrań
      setTimeout(() => {
        fetchRecordings();
      }, 500);
    } else {
      startRecording();
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <GradientText text="Mój Pamiętnik" style={styles.titleText} />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Graph')}
            style={[
              styles.iconButton,
              {
                borderColor: colors.tileBorder,
                backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
              },
            ]}
            accessibilityLabel="Graf powiązań"
          >
            <Feather name="share-2" size={18} color="#38BDF8" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Chat')}
            style={[
              styles.iconButton,
              {
                borderColor: colors.tileBorder,
                backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
              },
            ]}
            accessibilityLabel="Czat z pamiętnikiem"
          >
            <Feather name="message-circle" size={18} color="#A855F7" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Badges')}
            style={[
              styles.iconButton,
              {
                borderColor: colors.tileBorder,
                backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
              },
            ]}
          >
            <Feather name="award" size={18} color="#FBBF24" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={[
              styles.iconButton,
              {
                borderColor: colors.tileBorder,
                backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
              },
            ]}
          >
            <Feather name="settings" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Analytics banner */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Insights')}>
        <GlassCard intensity={20} style={styles.analyticsBanner}>
          <View style={styles.analyticsContent}>
            <View style={styles.analyticsHeader}>
              <Feather name="trending-up" size={15} color="#F0ABFC" />
              <Text style={[styles.analyticsHeaderText, { color: colors.textSecondary }]}>Podsumowanie Tygodnia</Text>
            </View>
            <View style={styles.analyticsRow}>
              <Text style={[styles.analyticsMainText, { color: colors.text }]}>Twój spokój to </Text>
              <GradientText
                text={`${calmPercentage}%`}
                colors={['#38BDF8', '#818CF8', '#F472B6']}
                style={styles.analyticsMainText}
              />
            </View>
            <Text style={[styles.analyticsSubText, { color: colors.textSecondary }]}>Zobacz Weekly Insights →</Text>
          </View>
          <View style={styles.chartPlaceholder}>
            {calmData.map((point, index) => (
              <LinearGradient
                key={index}
                colors={['#60A5FA', '#F472B6']}
                style={[
                  styles.chartLine,
                  {
                    height: point.value > 0 ? point.value * 0.4 : 10,
                    left: index * 15,
                  },
                ]}
              />
            ))}
          </View>
        </GlassCard>
      </TouchableOpacity>

      {/* Status nagrań na żywo (Realtime) */}
      <RecordingStatusList
        recordings={recordings}
        onRetry={retryRecording}
        textColor={colors.text}
        secondaryTextColor={colors.textSecondary}
      />

      {/* Przełącznik zakładek Wpisy / Notatki */}
      <View style={[styles.tabSwitcher, { borderColor: colors.tileBorder }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('entries')}
          style={[styles.tabButton, activeTab === 'entries' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'entries' ? '#ffffff' : colors.textSecondary }]}>
            Wpisy dnia
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('notes')}
          style={[styles.tabButton, activeTab === 'notes' && styles.tabButtonActive]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'notes' ? '#ffffff' : colors.textSecondary }]}>
            Notatki ({notes.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const error = diaryError || notesError;
  const isLoading = isDiaryLoading || isLoadingNotes;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BadgeAlertModal />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {activeTab === 'notes' ? (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View>
              {renderHeader()}
              <NotesList
                notes={notes}
                activeFilter={activeFilter}
                onFilterChange={setFilter}
                textColor={colors.text}
                secondaryTextColor={colors.textSecondary}
              />
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : isLoading ? (
        <ActivityIndicator size="large" color="#F472B6" style={styles.loader} />
      ) : (
        <FlatList
          data={entries}
          ListHeaderComponent={renderHeader}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <GlassCard intensity={15} style={styles.emptyCard}>
              <Feather name="calendar" size={32} color={colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Brak wpisów dnia. Nagraj myśli, a wieczorem wygeneruje się podsumowanie!
              </Text>
            </GlassCard>
          }
          renderItem={({ item }) => {
            const d = formatDate(item.createdAt || item.date);
            const parsed = (item.parsedData as any) || {};
            const emotions = parsed.emotions || [];
            const summary = parsed.summary || item.fullText.slice(0, 100) + '...';

            return (
              <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Detail', { entryId: item.id })}>
                <GlassCard intensity={20} style={styles.entryCard}>
                  <View style={styles.entryCardHeader}>
                    <Text style={[styles.entryCardDate, { color: colors.text }]}>{d.full}</Text>
                    <Text style={[styles.entryCardTime, { color: colors.textSecondary }]}>{d.time}</Text>
                  </View>
                  <Text style={[styles.entryCardSummary, { color: colors.textSecondary }]} numberOfLines={3}>
                    {summary}
                  </Text>
                  {emotions.length > 0 && (
                    <View style={styles.emotionsRow}>
                      {emotions.map((e: string, i: number) => (
                        <EmotionPill key={i} id={e} />
                      ))}
                    </View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Rygorystycznie optymalizowany komponent BlurView */}
      <RecordingOverlay isRecording={isRecording} />

      {/* FAB - Figma Exact Match */}
      <View style={styles.fabContainer}>
        {isProcessing && (
          <View
            style={[
              styles.processingPill,
              {
                backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)',
              },
            ]}
          >
            <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.processingText, { color: colors.text }]}>Sztuczna Inteligencja analizuje...</Text>
          </View>
        )}
        <TouchableOpacity activeOpacity={0.9} onPress={handleRecordPress} style={styles.fabWrapper}>
          <LinearGradient
            colors={isRecording ? ['#EF4444', '#B91C1C'] : ['#A78BFA', '#F472B6', '#60A5FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabButton}
          >
            <Feather name="mic" size={28} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 160,
  },
  headerContainer: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsBanner: {
    padding: 18,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  analyticsContent: {
    flex: 1,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  analyticsHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  analyticsMainText: {
    fontSize: 18,
    fontWeight: '700',
  },
  analyticsSubText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chartPlaceholder: {
    width: 90,
    height: 40,
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
  },
  chartLine: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    borderRadius: 3,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#A78BFA',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    marginTop: 40,
  },
  errorBox: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
  },
  emptyCard: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  entryCard: {
    padding: 18,
    marginBottom: 14,
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryCardDate: {
    fontSize: 15,
    fontWeight: '600',
  },
  entryCardTime: {
    fontSize: 13,
  },
  entryCardSummary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  emotionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fabWrapper: {
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  fabButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  processingText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
