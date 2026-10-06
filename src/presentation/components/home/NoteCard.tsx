import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NoteDocument } from '../../../domain/models/NoteDocument';
import { GlassCard, NoteTypeChip, useTheme } from '../ui';
import { formatNoteWhen } from './homeLogic';

interface NoteCardProps {
  note: NoteDocument;
  today: string;
  onPress: () => void;
}

/** Karta notatki: chip typu, czas, tytuł i dwie linie treści. */
export const NoteCard: React.FC<NoteCardProps> = ({ note, today, onPress }) => {
  const { colors } = useTheme();
  return (
    <GlassCard onPress={onPress} accessibilityLabel={note.title}>
      <View style={styles.header}>
        <NoteTypeChip type={note.noteType} />
        <Text style={[styles.when, { color: colors.textSecondary }]}>{formatNoteWhen(note.createdAt, today)}</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{note.title}</Text>
      {note.content ? (
        <Text style={[styles.text, { color: colors.textSecondary }]} numberOfLines={2}>
          {note.content}
        </Text>
      ) : null}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  when: { fontSize: 13 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, lineHeight: 21, marginBottom: 6 },
  text: { fontSize: 13, lineHeight: 18 },
});
