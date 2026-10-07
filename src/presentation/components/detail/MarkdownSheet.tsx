import React from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../ui';
import { pl } from '../../i18n/pl';

interface MarkdownSheetProps {
  visible: boolean;
  markdown: string;
  onClose: () => void;
}

/** Szuflada „Podgląd pliku .md”: prawdziwy `documents.body_md` w monospace i przycisk „Gotowe”. */
export const MarkdownSheet: React.FC<MarkdownSheetProps> = ({ visible, markdown, onClose }) => {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.veil, { backgroundColor: colors.veil }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={pl.detail.md.done} />
        <View style={[styles.sheet, { backgroundColor: colors.sheet, borderColor: colors.border }]}>
          <View style={[styles.grab, { backgroundColor: colors.textSecondary }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{pl.detail.md.title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10}>
              <Text style={[styles.done, { color: colors.primary }]}>{pl.detail.md.done}</Text>
            </Pressable>
          </View>
          <ScrollView
            style={[styles.md, { backgroundColor: colors.card2, borderColor: colors.border }]}
            contentContainerStyle={styles.mdContent}
          >
            <Text selectable style={[styles.mdText, { color: colors.text }]}>
              {markdown}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  veil: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    height: '80%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  grab: { width: 38, height: 5, borderRadius: 3, opacity: 0.4, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  done: { fontSize: 16, fontWeight: '800' },
  md: { flex: 1, borderRadius: 16, borderWidth: 1 },
  mdContent: { padding: 14 },
  mdText: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 11.5,
    lineHeight: 18,
  },
});
