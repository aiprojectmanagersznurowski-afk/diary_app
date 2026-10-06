import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GlassCard, useTheme, ACCENTS, WHITE } from '../ui';
import { ProcessingBanner } from './homeLogic';

/** Pasek statusu przetwarzania na ekranie głównym; dotknięcie otwiera ekran Nagrania. */
export const ProcessingBannerCard: React.FC<{ banner: ProcessingBanner; onPress: () => void }> = ({
  banner,
  onPress,
}) => {
  const { colors } = useTheme();
  return (
    <GlassCard onPress={onPress} padding={0} style={styles.card} accessibilityLabel={banner.text}>
      <View style={styles.row}>
        {banner.kind === 'processing' ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View style={[styles.errorDot, { backgroundColor: ACCENTS.errorStrong }]}>
            <Feather name="alert-circle" size={15} color={WHITE} />
          </View>
        )}
        <View style={styles.texts}>
          <Text style={[styles.title, { color: colors.text }]}>{banner.text}</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>{banner.sub}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textSecondary} />
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: { marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  errorDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
});
