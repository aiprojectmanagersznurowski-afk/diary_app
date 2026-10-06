import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import {
  Recording,
  getRecordingProgress,
  getRecordingStatusLabel,
  isRecordingInProgress,
  isRecordingRetryable,
  mapRecordingStatusToUi,
} from '../../domain/models/Recording';
import { StatusChip, useTheme, withAlpha, ACCENTS } from './ui';
import { pl } from '../i18n/pl';
import { formatClock, formatRecordingSub } from './home/homeLogic';

interface RecordingRowProps {
  recording: Recording;
  today: string;
  /** Liczba notatek z tego nagrania (podpis wiersza gotowego nagrania). */
  noteCount?: number;
  /** Ostatni wiersz w karcie (bez dolnej kreski). */
  last?: boolean;
  onRetry?: (id: string) => void;
  /** Wiersz klikalny (lista nagrań gotowych → wpis dnia). */
  onPress?: () => void;
}

/** Wiersz nagrania: ikona źródła, czas, podpis, pasek postępu (w toku), chip statusu i ponowienie przy błędzie. */
export const RecordingRow: React.FC<RecordingRowProps> = ({ recording, today, noteCount, last, onRetry, onPress }) => {
  const { colors } = useTheme();
  const inProgress = isRecordingInProgress(recording.status);
  const content = (
    <View style={styles.row}>
      <View style={[styles.sourceIcon, { backgroundColor: colors.card2 }]}>
        <Feather name={recording.source === 'watch' ? 'watch' : 'smartphone'} size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.mid}>
        <Text style={[styles.title, { color: colors.text }]}>
          {pl.recordings.rowLabel(formatClock(recording.recordedAt))}
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          {formatRecordingSub(recording, today, noteCount)}
        </Text>
        {inProgress ? (
          <View style={[styles.track, { backgroundColor: colors.track }]}>
            <LinearGradient
              colors={colors.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: `${getRecordingProgress(recording.status)}%`, height: '100%' }}
            />
          </View>
        ) : null}
      </View>
      <StatusChip stage={mapRecordingStatusToUi(recording.status)} label={getRecordingStatusLabel(recording.status)} />
      {onPress ? <Feather name="chevron-right" size={16} color={colors.textSecondary} /> : null}
    </View>
  );

  return (
    <View style={[styles.wrapper, !last && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={pl.recordings.rowLabel(formatClock(recording.recordedAt))}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
      {isRecordingRetryable(recording.status) && onRetry ? (
        <Pressable
          onPress={() => onRetry(recording.id)}
          accessibilityRole="button"
          style={[
            styles.retry,
            { backgroundColor: withAlpha(ACCENTS.error, 0.14), borderColor: withAlpha(ACCENTS.error, 0.35) },
          ]}
        >
          <Feather name="refresh-cw" size={14} color={ACCENTS.error} />
          <Text style={[styles.retryText, { color: ACCENTS.error }]}>{pl.recordings.retry}</Text>
        </Pressable>
      ) : null}
      {recording.lastError && recording.status === 'failed' ? (
        <Text style={[styles.error, { color: ACCENTS.error }]} numberOfLines={2}>
          {recording.lastError}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sourceIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  track: { height: 3, borderRadius: 2, marginTop: 7, overflow: 'hidden' },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    marginLeft: 48,
  },
  retryText: { fontSize: 13, fontWeight: '700' },
  error: { fontSize: 12, marginTop: 6, marginLeft: 48 },
});
