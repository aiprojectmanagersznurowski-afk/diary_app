import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RoundIconButton, useTheme, ACCENTS } from '../ui';
import { pl } from '../../i18n/pl';
import { FlameIcon } from './FlameIcon';

export type HomeTarget = 'Graph' | 'Chat' | 'Recordings' | 'Badges' | 'Settings';

interface HomeHeaderProps {
  streak: number;
  /** Plakietka przycisku Nagrania: liczba w toku, `error` = czerwona. */
  recordingsBadge: { count: number; error: boolean } | null;
  onNavigate: (target: HomeTarget) => void;
}

/** Nagłówek ekranu głównego: licznik serii i przyciski w kółkach (docs/08-design-ui.md §2.3). */
export const HomeHeader: React.FC<HomeHeaderProps> = ({ streak, recordingsBadge, onNavigate }) => {
  const { colors } = useTheme();
  const a11y = pl.home.a11y;
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onNavigate('Badges')}
        accessibilityRole="button"
        accessibilityLabel={a11y.streak}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={[styles.streak, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <FlameIcon />
        <Text style={[styles.streakText, { color: colors.text }]}>{streak}</Text>
      </Pressable>
      <View style={styles.buttons}>
        <RoundIconButton
          icon="share-2"
          iconColor={ACCENTS.sky}
          accessibilityLabel={a11y.graph}
          onPress={() => onNavigate('Graph')}
        />
        <RoundIconButton
          icon="message-circle"
          iconColor={ACCENTS.purple}
          accessibilityLabel={a11y.chat}
          onPress={() => onNavigate('Chat')}
        />
        <RoundIconButton
          icon="activity"
          iconColor={ACCENTS.pink}
          accessibilityLabel={a11y.recordings}
          badge={recordingsBadge ? (recordingsBadge.error ? 'error' : recordingsBadge.count) : undefined}
          onPress={() => onNavigate('Recordings')}
        />
        <RoundIconButton
          icon="award"
          iconColor={ACCENTS.amber}
          accessibilityLabel={a11y.badges}
          onPress={() => onNavigate('Badges')}
        />
        <RoundIconButton icon="settings" accessibilityLabel={a11y.settings} onPress={() => onNavigate('Settings')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  streakText: { fontSize: 15, fontWeight: '800' },
  buttons: { flexDirection: 'row', gap: 8 },
});
