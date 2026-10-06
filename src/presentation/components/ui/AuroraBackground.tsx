import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from './useTheme';
import { parseColor } from './colorUtils';

interface BlobProps {
  id: string;
  color: string;
  size: number;
  position: ViewStyle;
  durationMs: number;
  reverse?: boolean;
}

/** Jedna plama aurory: miękki radialny gradient, wolno dryfujący tam i z powrotem. */
const Blob: React.FC<BlobProps> = ({ id, color, size, position, durationMs, reverse }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const { rgb, alpha } = useMemo(() => parseColor(color), [color]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: durationMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: durationMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, durationMs]);

  const dir = reverse ? -1 : 1;
  const transform = [
    { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 40 * dir] }) },
    { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) },
    { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
  ];

  return (
    <Animated.View style={[styles.blob, { width: size, height: size }, position, { transform }]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={rgb} stopOpacity={alpha} />
            <Stop offset="1" stopColor={rgb} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
};

/** Trzy rozmyte plamy za treścią; kolory z motywu (docs/08-design-ui.md §1). */
export const AuroraBackground: React.FC = () => {
  const { colors } = useTheme();
  const [c1, c2, c3] = colors.aurora;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Blob id="aur1" color={c1} size={460} position={{ left: -180, top: -140 }} durationMs={16000} />
      <Blob id="aur2" color={c2} size={400} position={{ right: -200, top: 130 }} durationMs={19000} reverse />
      <Blob id="aur3" color={c3} size={430} position={{ left: -30, bottom: -250 }} durationMs={22000} />
    </View>
  );
};

const styles = StyleSheet.create({
  blob: { position: 'absolute' },
});
