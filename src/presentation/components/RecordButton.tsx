import React, { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export const RecordButton: React.FC<RecordButtonProps> = ({ isRecording, onPress, disabled }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      pulseAnim.stopAnimation();
    }
  }, [isRecording, pulseAnim]);

  return (
    <View style={styles.container}>
      {/* Siri Glow Effect Background */}
      {isRecording && (
        <Animated.View
          style={[
            styles.glowContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <LinearGradient
            colors={[colors.primary, colors.gradientColors[1] || colors.primary, colors.gradientColors[2] || colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.glow, { opacity: 0.5 }]}
          />
        </Animated.View>
      )}

      {/* Main Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={disabled}
        style={[styles.buttonWrapper, { borderColor: colors.tileBorder }]}
      >
        <LinearGradient
          colors={isRecording ? ['#ef4444', '#dc2626'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
          style={styles.button}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={28}
            color={colors.text}
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  glowContainer: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    opacity: 0.8,
  },
  buttonWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
