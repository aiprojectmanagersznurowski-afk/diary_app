import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './useTheme';

interface GradientTextProps {
  /** Tekst do wyświetlenia (alternatywa dla `children`). */
  text?: string;
  children?: React.ReactNode;
  /** Kolory gradientu; domyślnie gradient bieżącego motywu. */
  colors?: readonly [string, string, ...string[]];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/** Tekst z gradientem. Tytuły: waga 800, letter-spacing -0.5 (docs/08-design-ui.md §0). */
export const GradientText: React.FC<GradientTextProps> = ({ text, children, colors, style, numberOfLines }) => {
  const { colors: theme } = useTheme();
  const gradient = colors ?? theme.gradientColors;
  const content = text ?? children;
  return (
    <MaskedView
      maskElement={
        <Text numberOfLines={numberOfLines} style={[style, { backgroundColor: 'transparent' }]}>
          {content}
        </Text>
      }
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text numberOfLines={numberOfLines} style={[style, { opacity: 0 }]}>
          {content}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

/** Styl tytułu ekranu z briefu (waga 800, letter-spacing -0.5). */
export const titleTextStyle: TextStyle = { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, lineHeight: 36 };
