import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { NoteType } from '../../domain/models/NoteDocument';
import { Chip } from './ui';
import { pl } from '../i18n/pl';

export type NoteFilter = NoteType | 'all';

const FILTER_KEYS: NoteFilter[] = ['all', 'idea', 'task', 'reflection', 'event'];

interface NoteFiltersProps {
  activeFilter: NoteFilter;
  onFilterChange: (filter: NoteFilter) => void;
}

/** Rząd chipów filtrujących notatki: Wszystkie / Pomysły / Zadania / Refleksje / Wydarzenia. */
export const NoteFilters: React.FC<NoteFiltersProps> = ({ activeFilter, onFilterChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.scroll}
    contentContainerStyle={styles.content}
  >
    {FILTER_KEYS.map((key) => (
      <Chip
        key={key}
        label={pl.home.filters[key]}
        selected={activeFilter === key}
        onPress={() => onFilterChange(key)}
      />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -20, marginBottom: 14 },
  content: { gap: 8, paddingHorizontal: 20 },
});
