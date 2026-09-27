import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  NoteDocument,
  NoteType,
  getNoteTypeLabel,
  getNoteTypeColor,
  getNoteTypeIcon,
} from '../../domain/models/NoteDocument';
import { GlassCard } from './UIPrimitives';

interface NotesListProps {
  notes: NoteDocument[];
  activeFilter: NoteType | 'all';
  onFilterChange: (filter: NoteType | 'all') => void;
  textColor?: string;
  secondaryTextColor?: string;
}

const FILTERS: { key: NoteType | 'all'; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'idea', label: 'Pomysły' },
  { key: 'task', label: 'Zadania' },
  { key: 'reflection', label: 'Refleksje' },
  { key: 'event', label: 'Wydarzenia' },
];

export const NotesList: React.FC<NotesListProps> = ({
  notes,
  activeFilter,
  onFilterChange,
  textColor = '#ffffff',
  secondaryTextColor = 'rgba(255,255,255,0.6)',
}) => {
  const filteredNotes = activeFilter === 'all' ? notes : notes.filter((n) => n.noteType === activeFilter);

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: secondaryTextColor }]}>Twoje myśli i notatki</Text>

      {/* Pigułki filtrowania */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.7}
              onPress={() => onFilterChange(f.key)}
              style={[styles.filterPill, isActive ? styles.filterPillActive : styles.filterPillInactive]}
            >
              <Text style={[styles.filterPillText, { color: isActive ? '#ffffff' : secondaryTextColor }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista notatek */}
      {filteredNotes.length === 0 ? (
        <GlassCard intensity={15} style={styles.emptyCard}>
          <Feather name="inbox" size={32} color={secondaryTextColor} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyText, { color: secondaryTextColor }]}>
            {activeFilter === 'all'
              ? 'Brak notatek. Nagraj pierwszą myśl, aby AI podzieliło ją na notatki!'
              : `Brak notatek w kategorii "${FILTERS.find((f) => f.key === activeFilter)?.label}".`}
          </Text>
        </GlassCard>
      ) : (
        filteredNotes.map((note) => {
          const typeColor = getNoteTypeColor(note.noteType);
          const typeLabel = getNoteTypeLabel(note.noteType);
          const iconName = getNoteTypeIcon(note.noteType) as any;

          return (
            <GlassCard key={note.id} intensity={20} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor + '20', borderColor: typeColor }]}>
                  <Feather name={iconName} size={12} color={typeColor} style={{ marginRight: 4 }} />
                  <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
                </View>

                {note.categoryName ? (
                  <View style={styles.categoryBadge}>
                    <Text style={[styles.categoryText, { color: secondaryTextColor }]}>{note.categoryName}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.noteTitle, { color: textColor }]}>{note.title}</Text>

              {note.content ? (
                <Text style={[styles.noteContent, { color: secondaryTextColor }]} numberOfLines={3}>
                  {note.content}
                </Text>
              ) : null}

              {note.tags && note.tags.length > 0 ? (
                <View style={styles.tagsRow}>
                  {note.tags.map((tag, idx) => (
                    <View key={idx} style={styles.tagChip}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </GlassCard>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  filtersScroll: {
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: '#A78BFA',
    borderColor: '#A78BFA',
  },
  filterPillInactive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  noteCard: {
    padding: 16,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 22,
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#A78BFA',
    fontWeight: '500',
  },
});
