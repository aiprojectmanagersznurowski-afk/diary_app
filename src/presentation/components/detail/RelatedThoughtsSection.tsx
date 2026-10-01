import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RelatedThought, getRelationTypeLabel, getRelationTypeIcon } from '../../../domain/models/RelatedThought';
import { getNoteTypeColor, getNoteTypeIcon } from '../../../domain/models/NoteDocument';
import { useSettingsStore, THEMES } from '../../../application/store/useSettingsStore';
import { GlassCard } from '../UIPrimitives';

interface RelatedThoughtsSectionProps {
  thoughts: RelatedThought[];
  isLoading: boolean;
  error?: string | null;
  onThoughtPress: (documentId: string) => void;
  disabled?: boolean;
}

export const RelatedThoughtsSection: React.FC<RelatedThoughtsSectionProps> = ({
  thoughts,
  isLoading,
  error,
  onThoughtPress,
  disabled = false,
}) => {
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="share-2" size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>POWIĄZANE MYŚLI</Text>
        </View>
        {thoughts.length > 0 && (
          <Text style={[styles.countBadge, { color: colors.textSecondary }]}>
            {thoughts.length} {thoughts.length === 1 ? 'powiązanie' : 'powiązania'}
          </Text>
        )}
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>Szukam powiązanych myśli...</Text>
        </View>
      )}

      {!isLoading && error && (
        <GlassCard
          intensity={theme === 'AppleLight' ? 60 : 20}
          style={[styles.emptyCard, { borderColor: colors.tileBorder }]}
        >
          <Feather name="alert-circle" size={18} color="#EF4444" style={styles.emptyIcon} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
        </GlassCard>
      )}

      {!isLoading && !error && thoughts.length === 0 && (
        <GlassCard
          intensity={theme === 'AppleLight' ? 60 : 20}
          style={[
            styles.emptyCard,
            {
              borderColor: colors.tileBorder,
              backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
            },
          ]}
        >
          <Feather name="link-2" size={20} color={colors.textSecondary} style={styles.emptyIcon} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Brak bezpośrednich powiązań z innymi wpisami. W miarę dodawania kolejnych notatek algorytm powiąże je
            automatycznie.
          </Text>
        </GlassCard>
      )}

      {!isLoading && !error && thoughts.length > 0 && (
        <View style={styles.list}>
          {thoughts.map((item) => {
            const isDaily = item.kind === 'daily';
            const iconName = isDaily
              ? 'calendar'
              : item.noteType
                ? (getNoteTypeIcon(item.noteType) as any)
                : (getRelationTypeIcon(item.relationType) as any);
            const iconColor = isDaily ? '#38BDF8' : item.noteType ? getNoteTypeColor(item.noteType) : colors.primary;

            const simPercent =
              item.relationType === 'semantic' && item.similarity ? `${Math.round(item.similarity * 100)}%` : null;

            return (
              <TouchableOpacity
                key={item.documentId}
                style={[
                  styles.itemCard,
                  {
                    borderColor: colors.tileBorder,
                    backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
                  },
                ]}
                activeOpacity={0.7}
                disabled={disabled}
                onPress={() => onThoughtPress(item.documentId)}
              >
                <View style={[styles.iconWrapper, { backgroundColor: `${iconColor}20` }]}>
                  <Feather name={iconName} size={16} color={iconColor} />
                </View>

                <View style={styles.textContainer}>
                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title || item.day}
                  </Text>

                  <View style={styles.metaRow}>
                    <Text style={[styles.itemDate, { color: colors.textSecondary }]}>{item.day}</Text>
                    <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}>·</Text>
                    <Text style={[styles.relationBadge, { color: iconColor }]}>
                      {getRelationTypeLabel(item.relationType)}
                    </Text>
                    {simPercent && (
                      <>
                        <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}>·</Text>
                        <Text style={[styles.similarityText, { color: '#A78BFA' }]}>{simPercent}</Text>
                      </>
                    )}
                  </View>

                  {item.reason && (
                    <Text style={[styles.reasonText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.reason}
                    </Text>
                  )}
                </View>

                <Feather name="chevron-right" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  statusText: {
    fontSize: 13,
  },
  emptyCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyIcon: {
    marginRight: 12,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  list: {
    gap: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  itemDate: {
    fontSize: 12,
  },
  dotSeparator: {
    marginHorizontal: 4,
    fontSize: 12,
  },
  relationBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  similarityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
});
