import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useDiaryStore } from '../../application/store/useDiaryStore';
import { ACCENTS, RecordButton, formatTimer, useTheme } from './ui';
import { pl } from '../i18n/pl';

interface Props {
  isRecording: boolean;
  /** Dotknięcie przycisku stop w overlayu. */
  onStop: () => void;
}

const EQ_BARS = 10;
const WAVES = [
  { size: 220, delayMs: 0, metering: 1 },
  { size: 260, delayMs: 800, metering: 0.7 },
  { size: 240, delayMs: 1600, metering: 0.4 },
] as const;

const lerp = (from: number, to: number, amount: number) => (1 - amount) * from + amount * to;

/** Pulsująca fala (miękki radialny gradient); skala zależy od głośności nagrywania. */
const Wave: React.FC<{ id: string; color: string; size: number; delayMs: number; level: Animated.Value }> = ({
  id,
  color,
  size,
  delayMs,
  level,
}) => {
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delayMs),
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breathe, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [breathe, delayMs]);

  const scale = Animated.multiply(breathe.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.08] }), level);
  return (
    <Animated.View
      style={[
        styles.wave,
        { width: size, height: size },
        { opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] }), transform: [{ scale }] },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="0.7" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
};

/** Pasek equalizera: wysokość animowana przez scaleY (natywny sterownik), przesunięta w fazie. */
const EqBar: React.FC<{ index: number; color: string }> = ({ index, color }) => {
  const level = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(index * 80),
      Animated.loop(
        Animated.sequence([
          Animated.timing(level, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(level, {
            toValue: 0,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [level, index]);
  return (
    <Animated.View
      style={[
        styles.eqBar,
        {
          backgroundColor: color,
          transform: [{ scaleY: level.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }],
        },
      ]}
    />
  );
};

/** Pełnoekranowy overlay nagrywania: rozmycie, fale reagujące na głos, timer, equalizer i stop. */
export const RecordingOverlay: React.FC<Props> = ({ isRecording, onStop }) => {
  const { colors } = useTheme();
  const [seconds, setSeconds] = useState(0);
  const level = useRef(new Animated.Value(1)).current;
  const smoothed = useRef(1);

  useEffect(() => {
    if (!isRecording) return undefined;
    setSeconds(0);
    smoothed.current = 1;
    const timer = setInterval(() => {
      setSeconds(Math.floor(useDiaryStore.getState().getRecordingDuration() / 1000));
    }, 500);
    const meter = setInterval(() => {
      // Głośność w dB (−160 cisza … 0 głośno) → 0..1 → skala fal 1.0..1.6
      const normalized = Math.min(1, Math.max(0, (useDiaryStore.getState().getCurrentMetering() + 60) / 60));
      smoothed.current = lerp(smoothed.current, 1 + normalized * 0.6, 0.35);
      Animated.timing(level, { toValue: smoothed.current, duration: 100, useNativeDriver: true }).start();
    }, 100);
    return () => {
      clearInterval(timer);
      clearInterval(meter);
    };
  }, [isRecording, level]);

  const waveColors = useMemo(() => colors.gradientColors, [colors.gradientColors]);

  // BlurView mocno obciąża GPU, więc overlay jest w ogóle odmontowany poza nagrywaniem.
  if (!isRecording) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]}>
      <BlurView intensity={40} tint={colors.isLight ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.veil }]} />

      <View style={styles.liveRow}>
        <View style={[styles.liveDot, { backgroundColor: ACCENTS.error }]} />
        <Text style={[styles.liveText, { color: ACCENTS.error }]}>{pl.overlay.recording}</Text>
      </View>

      <View style={styles.waves}>
        {WAVES.map((wave, i) => (
          <Wave
            key={wave.size}
            id={`recWave${i}`}
            color={waveColors[i] ?? waveColors[0]}
            size={wave.size}
            delayMs={wave.delayMs}
            level={level}
          />
        ))}
        <RecordButton isRecording onPress={onStop} size={96} />
      </View>

      <Text style={[styles.timer, { color: colors.text }]}>{formatTimer(seconds)}</Text>
      <View style={styles.eq}>
        {Array.from({ length: EQ_BARS }, (_, i) => (
          <EqBar key={i} index={i} color={colors.primary} />
        ))}
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{pl.overlay.hint}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: 22, paddingHorizontal: 40, zIndex: 70 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  liveText: { fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  waves: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  wave: { position: 'absolute' },
  timer: { fontSize: 46, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  eq: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36 },
  eqBar: { width: 4, height: 34, borderRadius: 2 },
  hint: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
