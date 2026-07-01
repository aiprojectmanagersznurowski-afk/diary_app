import React from 'react';
import { Text, TextProps } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientTextProps extends TextProps {
  colors: readonly [string, string, ...string[]];
}

export const GradientText: React.FC<GradientTextProps> = (props) => {
  return (
    <MaskedView
      maskElement={<Text {...props} style={[props.style, { backgroundColor: 'transparent' }]} />}
    >
      <LinearGradient
        colors={props.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text {...props} style={[props.style, { opacity: 0 }]} />
      </LinearGradient>
    </MaskedView>
  );
};
