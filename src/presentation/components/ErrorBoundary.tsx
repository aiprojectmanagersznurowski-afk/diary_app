import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { PrimaryButton } from './ui';
import { pl } from '../i18n/pl';

interface Props {
  children: React.ReactNode;
  /** Wywoływane przy złapaniu błędu (np. do logu); dostaje tylko błąd, bez drzewa komponentów. */
  onError?: (error: Error) => void;
}

interface State {
  error: Error | null;
}

/** Fallback czyta motyw bezpośrednio ze store, bo ErrorBoundary stoi nad resztą aplikacji. */
const Fallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const theme = useSettingsStore((s) => s.theme);
  const colors = THEMES[theme];
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{pl.errors.boundaryTitle}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{pl.errors.boundaryBody}</Text>
      <View style={styles.button}>
        <PrimaryButton label={pl.errors.retry} onPress={onRetry} />
      </View>
    </View>
  );
};

/** Łapie wyjątki w renderze zamiast pozwolić na biały ekran lub crash całej aplikacji. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (this.state.error) return <Fallback onRetry={this.retry} />;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: 12 },
});
