import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GraphCategory, GraphFilters } from '../../../domain/models/Graph';
import { NoteType, getNoteTypeColor, getNoteTypeLabel } from '../../../domain/models/NoteDocument';
import { useSettingsStore, THEMES } from '../../../application/store/useSettingsStore';

interface GraphFilterBarProps {
  filters: GraphFilters;
  availableCategories: GraphCategory[];
  categoryColors: Record<string, string>;
  onFilterChange: (filters: Partial<GraphFilters>) => void;
  onResetFilters: () => void;
  onClose: () => void;
}

const ALL_NOTE_TYPES: NoteType[] = ['idea', 'task', 'reflection', 'event'];

const DATE_PRESETS = [
  { label: 'Wszystkie', days: null },
  { label: '7 dni', days: 7 },
  { label: '30 dni', days: 30 },
  { label: '90 dni', days: 90 },
];

const SCORE_PRESETS = [
  { label: 'Wszystkie', score: null },
  { label: 'Średnie (≥ 0.5)', score: 0.5 },
  { label: 'Mocne (≥ 0.7)', score: 0.7 },
];

export const GraphFilterBar: React.FC<GraphFilterBarProps> = ({
  filters,
  availableCategories,
  categoryColors,
  onFilterChange,
  onResetFilters,
  onClose,
}) => {
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];

  const activeNoteTypes = filters.noteTypes || [];
  const activeCategoryIds = filters.categoryIds || [];

  const handleToggleNoteType = (type: NoteType) => {
    let next: NoteType[];
    if (activeNoteTypes.includes(type)) {
      next = activeNoteTypes.filter((t) => t !== type);
    } else {
      next = [...activeNoteTypes, type];
    }
    onFilterChange({ noteTypes: next.length > 0 ? next : null });
  };

  const handleToggleCategory = (catId: string) => {
    let next: string[];
    if (activeCategoryIds.includes(catId)) {
      next = activeCategoryIds.filter((id) => id !== catId);
    } else {
      next = [...activeCategoryIds, catId];
    }
    onFilterChange({ categoryIds: next.length > 0 ? next : null });
  };

  const handleSelectDatePreset = (days: number | null) => {
    if (days === null) {
      onFilterChange({ dateFrom: null, dateTo: null });
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() - days);
    const dateFrom = d.toISOString().split('T')[0];
    onFilterChange({ dateFrom, dateTo: null });
  };

  const handleSelectScorePreset = (score: number | null) => {
    onFilterChange({ minScore: score });
  };

  const hasActiveFilters = Boolean(
    (filters.noteTypes && filters.noteTypes.length > 0) ||
    (filters.categoryIds && filters.categoryIds.length > 0) ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.minScore != null,
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.tileBorder }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="sliders" size={16} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Filtry grafu</Text>
        </View>
        <View style={styles.headerRight}>
          {hasActiveFilters && (
            <TouchableOpacity onPress={onResetFilters} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>Wyczyść</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Typy notatek */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TYPY NOTATEK</Text>
          <View style={styles.chipsRow}>
            {ALL_NOTE_TYPES.map((type) => {
              const isActive = activeNoteTypes.includes(type);
              const typeColor = getNoteTypeColor(type);
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => handleToggleNoteType(type)}
                  style={[
                    styles.chip,
                    {
                      borderColor: isActive ? typeColor : colors.tileBorder,
                      backgroundColor: isActive ? `${typeColor}22` : 'rgba(255,255,255,0.03)',
                    },
                  ]}
                >
                  <View style={[styles.colorDot, { backgroundColor: typeColor }]} />
                  <Text style={[styles.chipText, { color: isActive ? typeColor : colors.text }]}>
                    {getNoteTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Kategorie */}
        {availableCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>KATEGORIE</Text>
            <View style={styles.chipsRow}>
              {availableCategories.map((cat) => {
                const isActive = activeCategoryIds.includes(cat.id);
                const catColor = cat.color || categoryColors[cat.id] || colors.primary;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => handleToggleCategory(cat.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: isActive ? catColor : colors.tileBorder,
                        backgroundColor: isActive ? `${catColor}22` : 'rgba(255,255,255,0.03)',
                      },
                    ]}
                  >
                    <View style={[styles.colorDot, { backgroundColor: catColor }]} />
                    <Text style={[styles.chipText, { color: isActive ? catColor : colors.text }]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Zakres dat */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ZAKRES DAT</Text>
          <View style={styles.chipsRow}>
            {DATE_PRESETS.map((preset) => {
              const isSelected =
                preset.days === null ? !filters.dateFrom : Boolean(filters.dateFrom && !filters.dateTo);
              return (
                <TouchableOpacity
                  key={preset.label}
                  onPress={() => handleSelectDatePreset(preset.days)}
                  style={[
                    styles.chip,
                    {
                      borderColor: isSelected ? colors.primary : colors.tileBorder,
                      backgroundColor: isSelected ? `${colors.primary}22` : 'rgba(255,255,255,0.03)',
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: isSelected ? colors.primary : colors.text }]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Próg podobieństwa */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>POWIĄZANIA SEMANTYCZNE</Text>
          <View style={styles.chipsRow}>
            {SCORE_PRESETS.map((preset) => {
              const isSelected = filters.minScore === preset.score;
              return (
                <TouchableOpacity
                  key={preset.label}
                  onPress={() => handleSelectScorePreset(preset.score)}
                  style={[
                    styles.chip,
                    {
                      borderColor: isSelected ? '#A78BFA' : colors.tileBorder,
                      backgroundColor: isSelected ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255,255,255,0.03)',
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: isSelected ? '#A78BFA' : colors.text }]}>{preset.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 280,
  },
  header: {
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  resetButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    maxHeight: 220,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
