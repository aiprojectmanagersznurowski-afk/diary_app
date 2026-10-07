import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BackButton, RoundIconButton, useTheme } from '../ui';
import { pl } from '../../i18n/pl';

interface DetailTopBarProps {
  shareMode: boolean;
  selectedCount: number;
  onShare: () => void;
  onOpenMarkdown: () => void;
  onCancelShare: () => void;
  onFinishShare: () => void;
}

/** Górny pasek wpisu dnia: wstecz + udostępnij + .md, a w trybie udostępniania Anuluj / liczba sekcji / Gotowe. */
export const DetailTopBar: React.FC<DetailTopBarProps> = ({
  shareMode,
  selectedCount,
  onShare,
  onOpenMarkdown,
  onCancelShare,
  onFinishShare,
}) => {
  const { colors } = useTheme();
  if (shareMode) {
    return (
      <View style={styles.row}>
        <Pressable onPress={onCancelShare} accessibilityRole="button" style={styles.textButton}>
          <Text style={[styles.action, { color: colors.primary }]}>{pl.detail.share.cancel}</Text>
        </Pressable>
        <Text style={[styles.count, { color: colors.textSecondary }]}>{pl.detail.share.selected(selectedCount)}</Text>
        <Pressable onPress={onFinishShare} accessibilityRole="button" style={styles.textButton}>
          <Text style={[styles.action, styles.strong, { color: colors.primary }]}>{pl.detail.share.done}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <BackButton />
      <View style={styles.buttons}>
        <RoundIconButton icon="share" accessibilityLabel={pl.detail.a11y.share} onPress={onShare} />
        <RoundIconButton icon="file-text" accessibilityLabel={pl.detail.a11y.md} onPress={onOpenMarkdown} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
    marginBottom: 14,
  },
  buttons: { flexDirection: 'row', gap: 8 },
  textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  action: { fontSize: 16, fontWeight: '600' },
  strong: { fontWeight: '800' },
  count: { fontSize: 13, fontWeight: '600' },
});
