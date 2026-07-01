import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HomeScreenNavigationProp } from '../../navigation/types';
import { useDiaryStore } from '../../application/store/useDiaryStore';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { DiaryEntryCard } from '../components/DiaryEntryCard';
import { RecordButton } from '../components/RecordButton';
import { Feather } from '@expo/vector-icons';

export const HomeScreen = () => {
  const { entries, isLoading, isRecording, isProcessing, error, fetchEntries, startRecording, stopRecordingAndProcess } = useDiaryStore();
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  const navigation = useNavigation<HomeScreenNavigationProp>();

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecordingAndProcess();
    } else {
      startRecording();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, textAlign: 'center', flex: 1 }]}>Mój Pamiętnik</Text>
        <Feather 
          name="settings" 
          size={24} 
          color={colors.textSecondary} 
          onPress={() => navigation.navigate('Settings')} 
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <DiaryEntryCard 
              entry={item} 
              onPress={() => navigation.navigate('Detail', { entryId: item.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.bottomContainer}>
        {isProcessing && (
          <View style={styles.processingPill}>
            <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.processingText, { color: colors.text }]}>Sztuczna Inteligencja analizuje...</Text>
          </View>
        )}
        <RecordButton 
          isRecording={isRecording} 
          onPress={handleRecordPress} 
          disabled={isProcessing}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },
  loader: {
    marginTop: 50,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 150, // Space for the bottom record button
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  processingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorText: {
    color: '#F87171',
    textAlign: 'center',
  }
});
