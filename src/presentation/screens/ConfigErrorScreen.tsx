import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ACCENTS, GlassCard, ScreenContainer, WHITE, useTheme } from '../components/ui';
import { pl } from '../i18n/pl';

export interface ConfigIssueView {
  variable: string;
  message: string;
}

/** Pełnoekranowy komunikat o błędnej konfiguracji builda (lista problemów, bez wartości sekretów). */
export const ConfigErrorScreen: React.FC<{ issues: ConfigIssueView[] }> = ({ issues }) => {
  const { colors } = useTheme();
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.icon, { backgroundColor: ACCENTS.errorStrong }]}>
          <Feather name="alert-triangle" size={28} color={WHITE} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{pl.errors.configTitle}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{pl.errors.configIntro}</Text>

        <GlassCard style={styles.card}>
          {issues.map((issue) => (
            <View key={issue.variable} style={styles.issue}>
              <Text style={[styles.variable, { color: colors.text }]}>{issue.variable}</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{issue.message}</Text>
            </View>
          ))}
        </GlassCard>

        <Text style={[styles.body, { color: colors.textSecondary }]}>{pl.errors.configHint}</Text>
      </ScrollView>
    </ScreenContainer>
  );
};

interface ConfigGateProps {
  /** Wynik walidacji konfiguracji: `config === null` oznacza błąd. */
  result: { config: unknown | null; issues: ConfigIssueView[] };
  children: React.ReactNode;
}

/** Renderuje aplikację tylko przy poprawnej konfiguracji; w przeciwnym razie ekran „Błąd konfiguracji”. */
export const ConfigGate: React.FC<ConfigGateProps> = ({ result, children }) =>
  result.config ? <>{children}</> : <ConfigErrorScreen issues={result.issues} />;

const styles = StyleSheet.create({
  content: { paddingTop: 48, paddingBottom: 48, gap: 16 },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  body: { fontSize: 14, lineHeight: 20 },
  card: { marginVertical: 4 },
  issue: { paddingVertical: 8, gap: 2 },
  variable: { fontSize: 13, fontWeight: '700' },
  message: { fontSize: 13, lineHeight: 18 },
});
