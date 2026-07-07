import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';

interface GradientTextProps {
  text: string;
  colors?: readonly string[] | string[];
  style?: TextStyle | TextStyle[];
}

import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';

export const GradientText: React.FC<GradientTextProps> = ({ 
  text, 
  colors = ['#A78BFA', '#F472B6', '#60A5FA'],
  style 
}) => {
  return (
    <MaskedView
      maskElement={
        <Text style={[style, { backgroundColor: 'transparent' }]}>
          {text}
        </Text>
      }
    >
      <LinearGradient
        colors={colors as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[style, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
};

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  style,
  intensity = 20
}) => {
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  const isLight = theme === 'AppleLight' || theme === 'Sepia';

  return (
    <View style={[styles.glassWrapper, { borderColor: colors.tileBorder, backgroundColor: isLight ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.04)' }, style]}>
      <BlurView intensity={intensity} style={StyleSheet.absoluteFill} tint={isLight ? "light" : "dark"} />
      <View style={styles.glassContent}>
        {children}
      </View>
    </View>
  );
};

export type Emotion = {
  label: string;
  color: string;
  from: string;
  to: string;
};

export const EMOTIONS: Record<string, Emotion> = {
  joy: { label: "Radość", color: "#FDBA74", from: "#FBBF24", to: "#F472B6" },
  calm: { label: "Spokój", color: "#7DD3FC", from: "#38BDF8", to: "#818CF8" },
  stress: { label: "Stres", color: "#FCA5A5", from: "#FB7185", to: "#F87171" },
  gratitude: { label: "Wdzięczność", color: "#C4B5FD", from: "#A78BFA", to: "#F0ABFC" },
  focus: { label: "Skupienie", color: "#93C5FD", from: "#60A5FA", to: "#22D3EE" },
  fatigue: { label: "Zmęczenie", color: "#A5B4FC", from: "#818CF8", to: "#6366F1" },
  hope: { label: "Nadzieja", color: "#F0ABFC", from: "#E879F9", to: "#818CF8" },
};

export const EmotionPill: React.FC<{ id: string, trigger?: string }> = ({ id, trigger }) => {
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  // Normalize id, removing emoji if present and standardizing
  const rawId = (id || '').replace(/[^\w\s-]/gi, '').trim().toLowerCase();
  
  // Default to joy if not found
  const matchedKey = Object.keys(EMOTIONS).find(k => rawId.includes(k)) || 'joy';
  const e = EMOTIONS[matchedKey];
  
  return (
    <View style={[styles.pillContainer, { backgroundColor: `${e.from}22`, borderColor: colors.tileBorder }]}>
      <LinearGradient colors={[e.from, e.to]} style={styles.pillDot} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <Text style={[styles.pillText, { color: colors.textSecondary }]}>
        {id}{trigger ? `: ${trigger}` : ''}
      </Text> 
    </View>
  );
};

export const AuroraBackground = () => {
  const { theme } = useSettingsStore();
  if (theme === 'AppleLight' || theme === 'Sepia') return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.blob, { top: -100, left: -100, backgroundColor: 'rgba(167, 139, 250, 0.4)' }]} />
      <View style={[styles.blob, { top: 150, right: -150, backgroundColor: 'rgba(244, 114, 182, 0.3)' }]} />
      <View style={[styles.blob, { bottom: -50, left: 50, backgroundColor: 'rgba(96, 165, 250, 0.25)' }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  glassWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  glassContent: {
    padding: 20,
  },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    transform: [{ scaleX: 1.5 }, { scaleY: 1.2 }],
    opacity: 0.8,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  pillText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  }
});
