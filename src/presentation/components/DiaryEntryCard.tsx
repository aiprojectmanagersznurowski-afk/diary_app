import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { DiaryEntry } from '../../domain/models/DiaryEntry';
import { GradientText } from './GradientText';
import { Feather } from '@expo/vector-icons';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';

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

  const getGoalColor = (status: string) => {
    switch(status) {
      case 'POSITIVE': return '#4ADE80';
      case 'NEGATIVE': return '#F87171';
      default: return '#94A3B8';
    }
  };

  const getGoalIcon = (status: string) => {
    switch(status) {
      case 'POSITIVE': return 'arrow-up-circle';
      case 'NEGATIVE': return 'arrow-down-circle';
      default: return 'minus-circle';
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.container}>
      <BlurView intensity={20} tint={colors.tileTint} style={[styles.blurContainer, { borderColor: colors.tileBorder }]}>
        
        <View style={styles.header}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateStr}</Text>
          <Feather 
            name={getGoalIcon(parsedData.goal_alignment.status)} 
            size={18} 
            color={getGoalColor(parsedData.goal_alignment.status)} 
          />
        </View>

        <GradientText 
          colors={colors.gradientColors} 
          style={[styles.quoteText, { textAlign: 'center' }]}
          numberOfLines={2}
        >
          "{parsedData.quote}"
        </GradientText>
        
      </BlurView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurContainer: {
    padding: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  quoteText: {
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 26,
  }
});
