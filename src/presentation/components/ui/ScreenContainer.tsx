import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuroraBackground } from './AuroraBackground';
import { useTheme } from './useTheme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Poziomy odstęp treści (domyślnie 20 wg briefu). */
  paddingHorizontal?: number;
  /** Bez aurory (np. ekrany z pełnoekranową treścią). */
  withAurora?: boolean;
}

/** Tło motywu + aurora + odstęp od notcha; podstawa każdego ekranu. */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  paddingHorizontal = 20,
  withAurora = true,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {withAurora ? <AuroraBackground /> : null}
      <View
        style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom, paddingHorizontal }, style]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
