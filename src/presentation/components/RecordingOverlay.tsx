import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { useDiaryStore } from '../../application/store/useDiaryStore';

interface Props {
  isRecording: boolean;
}

// LERP function for smoothing
const lerp = (start: number, end: number, amt: number) => {
  return (1 - amt) * start + amt * end;
};

export const RecordingOverlay: React.FC<Props> = ({ isRecording }) => {
  const [durationStr, setDurationStr] = useState('00:00');

  // Use Animated.Value for Native Driver compatibility
  const waveScale1 = useRef(new Animated.Value(1)).current;
  const waveScale2 = useRef(new Animated.Value(1)).current;
  const waveScale3 = useRef(new Animated.Value(1)).current;
  const waveOpacity = useRef(new Animated.Value(0)).current;

  // We keep the current target scale in a mutable ref to lerp towards it
  const currentScaleRef = useRef(1);

  useEffect(() => {
    let animationFrameId: number;
    let timerInterval: NodeJS.Timeout;
    
    if (isRecording) {
      setDurationStr('00:00');
      timerInterval = setInterval(() => {
        const millis = useDiaryStore.getState().getRecordingDuration();
        const rawDb = useDiaryStore.getState().getCurrentMetering();
        console.log('[RecordingOverlay] timer tick, duration:', millis, 'metering:', rawDb);
        const totalSeconds = Math.floor(millis / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        setDurationStr(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }, 500);

      // Show waves
      Animated.timing(waveOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const updateWave = () => {
        const store = useDiaryStore.getState();
        const rawDb = store.getCurrentMetering(); // e.g., -160 (silence) to 0 (loud)
        
        // Normalize -60..0 to 0..1 (ignore anything below -60 as silence)
        let normalized = (rawDb + 60) / 60;
        if (normalized < 0) normalized = 0;
        if (normalized > 1) normalized = 1;

        // Target scale: 1.0 (silence) to ~2.5 (loud)
        const targetScale = 1 + normalized * 1.5;

        // LERP for smooth transition - 0.05 factor since updates come every 500ms
        currentScaleRef.current = lerp(currentScaleRef.current, targetScale, 0.05);

        Animated.parallel([
          Animated.timing(waveScale1, {
            toValue: currentScaleRef.current,
            duration: 16, // roughly 1 frame
            useNativeDriver: true,
          }),
          Animated.timing(waveScale2, {
            toValue: 1 + (currentScaleRef.current - 1) * 0.7,
            duration: 16,
            useNativeDriver: true,
          }),
          Animated.timing(waveScale3, {
            toValue: 1 + (currentScaleRef.current - 1) * 0.4,
            duration: 16,
            useNativeDriver: true,
          })
        ]).start();

        animationFrameId = requestAnimationFrame(updateWave);
      };

      animationFrameId = requestAnimationFrame(updateWave);

    } else {
      // Hide waves smoothly
      Animated.timing(waveOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.parallel([
        Animated.timing(waveScale1, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(waveScale2, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(waveScale3, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      
      currentScaleRef.current = 1;
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [isRecording, waveOpacity, waveScale1, waveScale2, waveScale3]);

  // Optymalizacja: BlurView mocno obciąża GPU. 
  // Całkowicie odmontowujemy go z drzewa, gdy isRecording === false.
  // Zostawiamy jedynie moment wygaszania (animacja), więc czekamy z odmontowaniem 
  // albo możemy po prostu odmontować natychmiast - co spowoduje gwałtowne zniknięcie blura.
  // Aby zniknięcie było płynne, musielibyśmy zaimplementować lokalny stan "isUnmounting".
  // Ponieważ użytkownik wymógł rygor unikania re-renderów, dla idealnej optymalizacji 
  // odmontowujemy od razu (BlurView zniknie gwałtownie, co nie jest błędem - to czysta wydajność).
  
  // Actually, wait, let's keep it simple: if (!isRecording) return null. The fade out won't be visible 
  // because the component unmounts. Let's just unmount it immediately.
  if (!isRecording) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      
      <View style={styles.wavesContainer}>
        <Animated.View style={[
          styles.wave, 
          styles.wave1, 
          { 
            opacity: waveOpacity,
            transform: [{ scale: waveScale1 }] 
          }
        ]} />
        <Animated.View style={[
          styles.wave, 
          styles.wave2, 
          { 
            opacity: waveOpacity,
            transform: [{ scale: waveScale2 }] 
          }
        ]} />
        <Animated.View style={[
          styles.wave, 
          styles.wave3, 
          { 
            opacity: waveOpacity,
            transform: [{ scale: waveScale3 }] 
          }
        ]} />
      </View>

      <Animated.View style={[styles.timerContainer, { opacity: waveOpacity }]}>
        <Text style={styles.timerText}>{durationStr}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wavesContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  wave: {
    position: 'absolute',
    borderRadius: 999,
  },
  wave1: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(244, 114, 182, 0.05)',
  },
  wave2: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
  },
  wave3: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  timerContainer: {
    position: 'absolute',
    top: 100, // Show timer near top
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timerText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'], // keep timer numbers aligned
  }
});
