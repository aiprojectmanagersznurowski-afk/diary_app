import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { RECORD_GLOW, RECORD_GRADIENT, RECORD_LIVE_GLOW, RECORD_LIVE_GRADIENT, RECORD_RING, WHITE } from './tokens';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** 76 px (FAB) albo 96 px (onboarding, overlay). */
  size?: 76 | 96;
}

const RINGS_DELAYS_MS = [0, 600, 1200];

/** Pulsujący pierścień (scale 1 → 2.3, opacity .9 → 0), przesunięty w czasie. */
const Ring: React.FC<{ delayMs: number; size: number }> = ({ delayMs, size }) => {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Przesunięcie (0 / 0,6 / 1,2 s) tylko na starcie; okres każdego pierścienia to stałe 1,8 s.
    const animation = Animated.sequence([
      Animated.delay(delayMs),
      Animated.loop(
        Animated.sequence([
          Animated.timing(progress, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [progress, delayMs]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 2.3] }) }],
        },
      ]}
    />
  );
};

/** Przycisk nagrywania (docs/08-design-ui.md §1.3): gradient; w trakcie nagrywania czerwony z trzema pierścieniami. */
export const RecordButton: React.FC<RecordButtonProps> = ({ isRecording, onPress, disabled, size = 76 }) => {
  const gradient = isRecording ? RECORD_LIVE_GRADIENT : RECORD_GRADIENT;
  const glow = isRecording ? RECORD_LIVE_GLOW : RECORD_GLOW;
  return (
    <View style={{ width: size, height: size }}>
      {isRecording ? RINGS_DELAYS_MS.map((d) => <Ring key={d} delayMs={d} size={size} />) : null}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'Zatrzymaj nagrywanie' : 'Nagraj'}
        style={({ pressed }) => [
          { width: size, height: size, borderRadius: size / 2, shadowColor: glow },
          styles.shadow,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, { borderRadius: size / 2 }]}
        >
          {isRecording ? (
            <View style={styles.stopSquare} />
          ) : (
            <Feather name="mic" size={size === 96 ? 36 : 30} color={WHITE} />
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shadow: { shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 30, elevation: 10 },
  pressed: { transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.6 },
  ring: { position: 'absolute', borderWidth: 2, borderColor: RECORD_RING },
  stopSquare: { width: 26, height: 26, borderRadius: 6, backgroundColor: WHITE },
});
