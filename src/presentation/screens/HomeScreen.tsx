import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDiaryStore } from '../../application/store/useDiaryStore';
import { useNotesStore } from '../../application/store/useNotesStore';
import { useAuthStore } from '../../application/store/useAuthStore';
import { useGamificationStore } from '../../application/store/useGamificationStore';
import { getDailyAnalyticsData } from '../../application/useCases/statsUseCase';
import { DailyDocument } from '../../domain/models/DailyDocument';
import { NoteDocument } from '../../domain/models/NoteDocument';
import {
  ACCENTS,
  GlassCard,
  GradientText,
  RecordButton,
  ScreenContainer,
  SegmentedControl,
  titleTextStyle,
  useTheme,
  withAlpha,
} from '../components/ui';
import { BadgeAlertModal } from '../components/BadgeAlertModal';
import { RecordingOverlay } from '../components/RecordingOverlay';
import { NoteFilters } from '../components/NotesList';
import { EntryCard, HIGHLIGHT_MS } from '../components/home/EntryCard';
import { NoteCard } from '../components/home/NoteCard';
import { HomeHeader, HomeTarget } from '../components/home/HomeHeader';
import { ProcessingBannerCard } from '../components/home/ProcessingBannerCard';
import { WeeklySummaryCard } from '../components/home/WeeklySummaryCard';
import { useRecordingControls } from '../components/home/useRecordingControls';
import {
  filterNotes,
  formatLongDate,
  getProcessingBanner,
  hasNewlyFinished,
  localDay,
  recordingsBadge,
  snapshotStatuses,
  sortNotes,
} from '../components/home/homeLogic';
import { pl } from '../i18n/pl';

type Tab = 'entries' | 'notes';
type ListItem = DailyDocument | NoteDocument;

export const HomeScreen = () => {
  const dailyDocuments = useDiaryStore((s) => s.dailyDocuments);
  const isDiaryLoading = useDiaryStore((s) => s.isLoading);
  const diaryError = useDiaryStore((s) => s.error);
  const fetchDailyDocuments = useDiaryStore((s) => s.fetchDailyDocuments);

  const recordings = useNotesStore((s) => s.recordings);
  const notes = useNotesStore((s) => s.notes);
  const activeFilter = useNotesStore((s) => s.activeFilter);
  const isLoadingNotes = useNotesStore((s) => s.isLoadingNotes);
  const notesError = useNotesStore((s) => s.error);
  const setFilter = useNotesStore((s) => s.setFilter);
  const fetchRecordings = useNotesStore((s) => s.fetchRecordings);
  const fetchNotes = useNotesStore((s) => s.fetchNotes);
  const subscribeToRealtime = useNotesStore((s) => s.subscribeToRealtime);

  const userId = useAuthStore((s) => s.user?.id);
  const streak = useGamificationStore((s) => s.currentStreak);
  const evaluateBadges = useGamificationStore((s) => s.evaluateBadges);

  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { isRecording, showProcessingPill, toggle } = useRecordingControls();

  const [tab, setTab] = useState<Tab>('entries');
  const [refreshing, setRefreshing] = useState(false);
  const [highlightToday, setHighlightToday] = useState(false);
  const previousStatuses = useRef<Record<string, string>>({});

  const today = localDay(new Date());

  useEffect(() => {
    void fetchDailyDocuments();
    void fetchRecordings();
    void fetchNotes();
    if (!userId) return undefined;
    return subscribeToRealtime(userId);
  }, [userId, fetchDailyDocuments, fetchRecordings, fetchNotes, subscribeToRealtime]);

  // Odznaki wynikają z serii i obecności wpisów (serwer ich nie przyznaje).
  useEffect(() => {
    evaluateBadges(streak, dailyDocuments.length > 0);
  }, [streak, dailyDocuments.length, evaluateBadges]);

  // Nagranie, które właśnie przeszło w „Gotowe”: odśwież wpisy i podświetl dzisiejszy.
  useEffect(() => {
    const finished = hasNewlyFinished(previousStatuses.current, recordings);
    previousStatuses.current = snapshotStatuses(recordings);
    if (!finished) return undefined;
    void fetchDailyDocuments();
    setHighlightToday(true);
    const timer = setTimeout(() => setHighlightToday(false), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [recordings, fetchDailyDocuments]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDailyDocuments(), fetchRecordings(), fetchNotes()]);
    setRefreshing(false);
  }, [fetchDailyDocuments, fetchRecordings, fetchNotes]);

  const alignment = useMemo(() => getDailyAnalyticsData(dailyDocuments, 7).goalAlignment, [dailyDocuments]);
  const banner = useMemo(() => getProcessingBanner(recordings), [recordings]);
  const badge = useMemo(() => recordingsBadge(recordings), [recordings]);
  const visibleNotes = useMemo(() => sortNotes(filterNotes(notes, activeFilter)), [notes, activeFilter]);

  const items: ListItem[] = tab === 'entries' ? dailyDocuments : visibleNotes;
  const error = diaryError || notesError;
  const isLoading = tab === 'entries' ? isDiaryLoading : isLoadingNotes;

  const open = (id: string) => navigation.navigate('Detail', { entryId: id });

  const header = (
    <View>
      <HomeHeader
        streak={streak}
        recordingsBadge={badge}
        onNavigate={(target: HomeTarget) => navigation.navigate(target)}
      />
      <Text style={[styles.date, { color: colors.textSecondary }]}>{formatLongDate(today)}</Text>
      <GradientText text={pl.home.title} style={titleTextStyle} />

      {banner ? <ProcessingBannerCard banner={banner} onPress={() => navigation.navigate('Recordings')} /> : null}
      <WeeklySummaryCard percent={alignment} onPress={() => navigation.navigate('Insights')} />

      <View style={styles.segmented}>
        <SegmentedControl
          options={[
            { key: 'entries', label: pl.home.tabEntries },
            { key: 'notes', label: pl.home.tabNotes(notes.length) },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'notes' ? <NoteFilters activeFilter={activeFilter} onFilterChange={setFilter} /> : null}

      {error ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: withAlpha(ACCENTS.errorStrong, 0.15), borderColor: withAlpha(ACCENTS.errorStrong, 0.4) },
          ]}
        >
          <Text style={[styles.errorText, { color: ACCENTS.error }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );

  const empty = isLoading ? (
    <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
  ) : (
    <Text style={[styles.empty, { color: colors.textSecondary }]}>
      {tab === 'entries' ? pl.home.emptyEntries : pl.home.emptyNotes}
    </Text>
  );

  return (
    <ScreenContainer>
      <FlatList<ListItem>
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        renderItem={({ item }) =>
          item.kind === 'daily' ? (
            <EntryCard
              entry={item}
              isToday={item.day === today}
              highlight={highlightToday && item.day === today}
              onPress={() => open(item.id)}
            />
          ) : (
            <NoteCard note={item} today={today} onPress={() => open(item.id)} />
          )
        }
      />

      {showProcessingPill ? (
        <GlassCard style={styles.pill} padding={0}>
          <View style={styles.pillRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.pillText, { color: colors.text }]}>{pl.home.processingPill}</Text>
          </View>
        </GlassCard>
      ) : null}

      <View style={styles.fab} pointerEvents="box-none">
        <RecordButton isRecording={isRecording} onPress={toggle} />
      </View>

      <RecordingOverlay isRecording={isRecording} onStop={toggle} />
      <BadgeAlertModal />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  date: { fontSize: 13, fontWeight: '600', marginBottom: 4, marginLeft: 2 },
  segmented: { marginTop: 24, marginBottom: 14 },
  listContent: { paddingBottom: 150 },
  separator: { height: 12 },
  loader: { marginTop: 40 },
  empty: { textAlign: 'center', fontSize: 14, paddingVertical: 30, paddingHorizontal: 10 },
  errorBox: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 14 },
  errorText: { fontSize: 14, textAlign: 'center' },
  pill: { position: 'absolute', alignSelf: 'center', bottom: 126, zIndex: 30 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 16 },
  pillText: { fontSize: 14, fontWeight: '600' },
  fab: { position: 'absolute', alignSelf: 'center', bottom: 34, zIndex: 20 },
});
