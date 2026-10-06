import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDiaryStore } from '../../application/store/useDiaryStore';
import { useNotesStore } from '../../application/store/useNotesStore';
import {
  ACCENTS,
  BackButton,
  GlassCard,
  GradientText,
  RecordButton,
  ScreenContainer,
  SectionLabel,
  titleTextStyle,
  useTheme,
} from '../components/ui';
import { RecordingOverlay } from '../components/RecordingOverlay';
import { RecordingRow } from '../components/RecordingStatusList';
import { useRecordingControls } from '../components/home/useRecordingControls';
import {
  countNotesByRecording,
  findDailyForRecording,
  localDay,
  splitRecordings,
  summarizeRecordings,
} from '../components/home/homeLogic';
import { pl } from '../i18n/pl';

/** Ekran „Twoje nagrania”: liczniki, status nagrań na żywo i lista przetworzonych (docs/08-design-ui.md §2.5). */
export const RecordingsScreen = () => {
  const recordings = useNotesStore((s) => s.recordings);
  const notes = useNotesStore((s) => s.notes);
  const retryRecording = useNotesStore((s) => s.retryRecording);
  const fetchRecordings = useNotesStore((s) => s.fetchRecordings);
  const fetchNotes = useNotesStore((s) => s.fetchNotes);
  const dailyDocuments = useDiaryStore((s) => s.dailyDocuments);
  const fetchDailyDocuments = useDiaryStore((s) => s.fetchDailyDocuments);

  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { isRecording, toggle } = useRecordingControls();
  const [refreshing, setRefreshing] = useState(false);

  const today = localDay(new Date());

  useEffect(() => {
    void fetchRecordings();
    if (dailyDocuments.length === 0) void fetchDailyDocuments();
  }, [fetchRecordings, fetchDailyDocuments, dailyDocuments.length]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchRecordings(), fetchNotes(), fetchDailyDocuments()]);
    setRefreshing(false);
  }, [fetchRecordings, fetchNotes, fetchDailyDocuments]);

  const summary = useMemo(() => summarizeRecordings(recordings), [recordings]);
  const { live, history } = useMemo(() => splitRecordings(recordings), [recordings]);
  const noteCounts = useMemo(() => countNotesByRecording(notes), [notes]);

  const tiles = [
    { label: pl.recordings.tileAll, value: summary.all, color: colors.text },
    { label: pl.recordings.tileActive, value: summary.active, color: colors.primary },
    { label: pl.recordings.tileErrors, value: summary.errors, color: ACCENTS.error },
  ];

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.topBar}>
          <BackButton />
          <Text style={[styles.barTitle, { color: colors.text }]}>{pl.recordings.screenTitle}</Text>
          <View style={styles.barSpacer} />
        </View>

        <GradientText text={pl.recordings.title} style={titleTextStyle} />
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{pl.recordings.subtitle}</Text>

        <View style={styles.tiles}>
          {tiles.map((tile) => (
            <GlassCard key={tile.label} style={styles.tile} padding={12}>
              <Text style={[styles.tileValue, { color: tile.color }]}>{tile.value}</Text>
              <Text style={[styles.tileLabel, { color: colors.textSecondary }]}>{tile.label}</Text>
            </GlassCard>
          ))}
        </View>

        <SectionLabel style={styles.label}>{pl.recordings.liveLabel}</SectionLabel>
        <GlassCard padding={0}>
          <View style={styles.listPadding}>
            {live.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>{pl.recordings.liveEmpty}</Text>
            ) : (
              live.map((recording, index) => (
                <RecordingRow
                  key={recording.id}
                  recording={recording}
                  today={today}
                  last={index === live.length - 1}
                  onRetry={retryRecording}
                />
              ))
            )}
          </View>
        </GlassCard>

        <SectionLabel style={styles.label}>{pl.recordings.historyLabel}</SectionLabel>
        <GlassCard padding={0}>
          <View style={styles.listPadding}>
            {history.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>{pl.recordings.historyEmpty}</Text>
            ) : (
              history.map((recording, index) => {
                const entry = findDailyForRecording(recording, dailyDocuments);
                return (
                  <RecordingRow
                    key={recording.id}
                    recording={recording}
                    today={today}
                    noteCount={noteCounts[recording.id]}
                    last={index === history.length - 1}
                    onPress={entry ? () => navigation.navigate('Detail', { entryId: entry.id }) : undefined}
                  />
                );
              })
            )}
          </View>
        </GlassCard>
      </ScrollView>

      <View style={styles.fab} pointerEvents="box-none">
        <RecordButton isRecording={isRecording} onPress={toggle} />
      </View>
      <RecordingOverlay isRecording={isRecording} onStop={toggle} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 150 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: 14,
  },
  barTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  barSpacer: { width: 40 },
  subtitle: { fontSize: 13, lineHeight: 18, marginTop: 8, marginHorizontal: 2 },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 12 },
  tile: { flex: 1, borderRadius: 18 },
  tileValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  tileLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  label: { marginTop: 26, marginBottom: 10, marginLeft: 4 },
  listPadding: { paddingHorizontal: 14, paddingVertical: 4 },
  empty: { textAlign: 'center', fontSize: 14, paddingVertical: 18, paddingHorizontal: 6 },
  fab: { position: 'absolute', alignSelf: 'center', bottom: 34 },
});
