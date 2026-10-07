import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GlassCard, SectionLabel, useTheme } from '../ui';
import { pl } from '../../i18n/pl';

interface SectionCardProps {
  /** Etykieta sekcji (UPPERCASE 12 px); pominięta, gdy `labelNode` ją zastępuje. */
  label?: string;
  labelNode?: React.ReactNode;
  children: React.ReactNode;
  /** Tryb udostępniania: karta jest zaznaczalna i pokazuje znacznik w prawym górnym rogu. */
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  /** Nazwa sekcji do etykiety dostępności znacznika. */
  sectionName?: string;
}

/** Karta sekcji wpisu dnia; w trybie udostępniania zaznaczana dotknięciem całej karty. */
export const SectionCard: React.FC<SectionCardProps> = ({
  label,
  labelNode,
  children,
  selectable,
  selected,
  onToggle,
  sectionName,
}) => {
  const { colors } = useTheme();
  return (
    <View>
      <GlassCard padding={16} style={selected ? { borderColor: colors.primary, borderWidth: 1.5 } : undefined}>
        <View style={selectable ? styles.selectablePad : undefined}>
          {labelNode ?? (label ? <SectionLabel style={styles.label}>{label}</SectionLabel> : null)}
          {children}
        </View>
      </GlassCard>
      {selectable ? (
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!selected }}
          accessibilityLabel={pl.detail.a11y.select(sectionName ?? label ?? '')}
          style={styles.overlay}
        >
          <View
            style={[
              styles.mark,
              selected
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { borderColor: colors.textSecondary },
            ]}
          >
            {selected ? <Feather name="check" size={15} color={colors.onPrimary} /> : null}
          </View>
        </Pressable>
      ) : null}
    </View>
  );
};

export const SectionText: React.FC<{ children: React.ReactNode; muted?: boolean }> = ({ children, muted }) => {
  const { colors } = useTheme();
  return <Text style={[styles.body, { color: muted ? colors.textSecondary : colors.text }]}>{children}</Text>;
};

const styles = StyleSheet.create({
  label: { marginBottom: 10 },
  selectablePad: { paddingRight: 30 },
  overlay: { ...StyleSheet.absoluteFillObject, borderRadius: 22 },
  mark: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { fontSize: 15, lineHeight: 22 },
});
