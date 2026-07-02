import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { DiaryEntry } from '../../domain/models/DiaryEntry';
import { Feather } from '@expo/vector-icons';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { GlassCard, GradientText } from './UIPrimitives';

interface DiaryEntryCardProps {
  entry: DiaryEntry;
  onPress: () => void;
}

export const DiaryEntryCard: React.FC<DiaryEntryCardProps> = ({ entry, onPress }) => {
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  
  const { parsedData } = entry;
  if (!parsedData) return null;

  const dateStr = new Date(entry.date).toLocaleDateString('pl-PL', { 
    weekday: 'short', month: 'long', day: 'numeric' 
  });

  // Fallback for old entries before Phase 10
  const dominantText = parsedData.dominantThought || (parsedData as any).quote || "Wpis z pamiętnika";
  const summaryText = parsedData.summary || "Brak podsumowania dla starego wpisu.";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.container}>
      <GlassCard intensity={25} style={[styles.glassCard, { borderColor: colors.tileBorder }]}>
        
        <View style={styles.header}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateStr}</Text>
          <View style={styles.iconContainer}>
            <Feather 
              name={parsedData.stressVsCalm === 'calm' ? 'smile' : parsedData.stressVsCalm === 'stress' ? 'frown' : 'meh'} 
              size={16} 
              color={colors.textSecondary} 
            />
          </View>
        </View>

        <GradientText 
          text={`"${dominantText}"`}
          colors={colors.gradientColors} 
          style={[styles.dominantText]}
        />
        
        <Text style={styles.summaryText} numberOfLines={2}>
          {summaryText}
        </Text>
        
      </GlassCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  glassCard: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    textTransform: 'capitalize',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  iconContainer: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  dominantText: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
  }
});
