import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Recording,
  getRecordingStatusLabel,
  getRecordingStatusBadgeColor,
  isRecordingRetryable,
} from '../../domain/models/Recording';
import { GlassCard } from './UIPrimitives';

interface RecordingStatusListProps {
  recordings: Recording[];
  onRetry: (id: string) => void;
  textColor?: string;
  secondaryTextColor?: string;
}

export const RecordingStatusList: React.FC<RecordingStatusListProps> = ({
  recordings,
  onRetry,
  textColor = '#ffffff',
  secondaryTextColor = 'rgba(255,255,255,0.6)',
}) => {
  // Pokazujemy maksymalnie 3 najnowsze nagrania (szczególnie aktywne/błędne)
  const activeOrRecent = recordings.slice(0, 3);

  if (activeOrRecent.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: secondaryTextColor }]}>Status nagrań na żywo</Text>
      {activeOrRecent.map((recording) => {
        const isRetryable = isRecordingRetryable(recording.status);
        const badgeColor = getRecordingStatusBadgeColor(recording.status);
        const label = getRecordingStatusLabel(recording.status);
        const isProcessing = recording.status === 'transcribed' || recording.status === 'segmented';

        const date = new Date(recording.recordedAt || recording.createdAt || Date.now());
        const timeString = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        return (
          <GlassCard key={recording.id} intensity={25} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.infoLeft}>
                <View style={[styles.statusDot, { backgroundColor: badgeColor }]} />
                <Text style={[styles.timeText, { color: textColor }]}>Nagranie z {timeString}</Text>
              </View>

              <View style={[styles.badge, { borderColor: badgeColor, backgroundColor: badgeColor + '20' }]}>
                {isProcessing && <ActivityIndicator size="small" color={badgeColor} style={{ marginRight: 6 }} />}
                <Text style={[styles.badgeText, { color: badgeColor }]}>{label}</Text>
              </View>
            </View>

            {recording.lastError ? (
              <Text style={styles.errorText} numberOfLines={2}>
                {recording.lastError}
              </Text>
            ) : null}

            {isRetryable && (
              <TouchableOpacity activeOpacity={0.8} style={styles.retryButton} onPress={() => onRetry(recording.id)}>
                <Feather name="refresh-cw" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.retryButtonText}>Ponów przetwarzanie</Text>
              </TouchableOpacity>
            )}
          </GlassCard>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#F87171',
    lineHeight: 16,
  },
  retryButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
