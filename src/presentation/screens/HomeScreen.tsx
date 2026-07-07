import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDiaryStore } from '../../application/store/useDiaryStore';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { getAnalyticsData, getWeeklyCalmPercentage } from '../../application/useCases/statsUseCase';
import { Feather, Ionicons } from '@expo/vector-icons';
import { GlassCard, GradientText, EmotionPill } from '../components/UIPrimitives';
import { BadgeAlertModal } from '../components/BadgeAlertModal';
import { RecordingOverlay } from '../components/RecordingOverlay';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const formatDate = (iso: string | Date | number) => {
  const d = new Date(iso);
  const days = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
  const months = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  return {
    weekday: days[d.getDay()],
    full: `${d.getDate()} ${months[d.getMonth()]}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
};

export const HomeScreen = () => {
  const { entries, isLoading, isRecording, isProcessing, error, fetchEntries, startRecording, stopRecordingAndProcess } = useDiaryStore();
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];
  const navigation = useNavigation<any>();

  const calmPercentage = getWeeklyCalmPercentage(entries);
  const { calm: calmData } = getAnalyticsData(entries, 7);

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

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <GradientText text="Mój Pamiętnik" style={styles.titleText} />
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Badges')} style={[styles.iconButton, { borderColor: colors.tileBorder, backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)' }]}>
            <Feather name="award" size={18} color="#FBBF24" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.iconButton, { borderColor: colors.tileBorder, backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)' }]}>
            <Feather name="settings" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Analytics banner */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('Insights')}>
        <GlassCard intensity={20} style={styles.analyticsBanner}>
          <View style={styles.analyticsContent}>
            <View style={styles.analyticsHeader}>
              <Feather name="trending-up" size={15} color="#F0ABFC" />
              <Text style={[styles.analyticsHeaderText, { color: colors.textSecondary }]}>Podsumowanie Tygodnia</Text>
            </View>
            <View style={styles.analyticsRow}>
              <Text style={[styles.analyticsMainText, { color: colors.text }]}>
                Twój spokój to{' '}
              </Text>
              <GradientText text={`${calmPercentage}%`} colors={['#38BDF8', '#818CF8', '#F472B6']} style={styles.analyticsMainText} />
            </View>
            <Text style={[styles.analyticsSubText, { color: colors.textSecondary }]}>Zobacz Weekly Insights →</Text>
          </View>
          <View style={styles.chartPlaceholder}>
            {calmData.map((point, index) => (
              <LinearGradient 
                key={index}
                colors={['#60A5FA', '#F472B6']} 
                style={[styles.chartLine, { height: point.value > 0 ? point.value * 0.4 : 10, left: index * 15 }]} 
              />
            ))}
          </View>
        </GlassCard>
      </TouchableOpacity>

      <Text style={[styles.recentEntriesTitle, { color: colors.textSecondary }]}>Ostatnie wpisy</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BadgeAlertModal />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator size="large" color="#F472B6" style={styles.loader} />
      ) : (
        <FlatList
          data={entries}
          ListHeaderComponent={renderHeader}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const d = formatDate(item.createdAt || item.date);
            const parsed = item.parsedData as any || {};
            const emotions = parsed.emotions || [];
            const summary = parsed.summary || item.fullText.slice(0, 100) + '...';

            return (
              <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Detail', { entryId: item.id })}>
                <GlassCard intensity={20} style={styles.entryCard}>
                  <View style={styles.entryCardHeader}>
                    <Text style={[styles.entryCardDate, { color: colors.text }]}>{d.full}</Text>
                    <Text style={[styles.entryCardTime, { color: colors.textSecondary }]}>{d.time}</Text>
                  </View>
                  <Text style={[styles.entryCardSummary, { color: colors.textSecondary }]} numberOfLines={3}>
                    {summary}
                  </Text>
                  {emotions.length > 0 && (
                    <View style={styles.emotionsRow}>
                      {emotions.map((e: string, i: number) => (
                        <EmotionPill key={i} id={e} />
                      ))}
                    </View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Rygorystycznie optymalizowany komponent BlurView */}
      <RecordingOverlay isRecording={isRecording} />

      {/* FAB - Figma Exact Match */}
      <View style={styles.fabContainer}>
        {isProcessing && (
          <View style={[styles.processingPill, { backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)' }]}>
            <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.processingText, { color: colors.text }]}>Sztuczna Inteligencja analizuje...</Text>
          </View>
        )}
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={handleRecordPress}
          style={styles.fabWrapper}
        >
          <LinearGradient
            colors={isRecording ? ['#EF4444', '#B91C1C'] : ['#A78BFA', '#F472B6', '#60A5FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabButton}
          >
            <Feather name="mic" size={28} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 160, 
  },
  headerContainer: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginBottom: 0,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerIcons: {
    flexDirection: 'row',
    marginTop: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  analyticsBanner: {
    padding: 16,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  analyticsContent: {
    flex: 1,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  analyticsHeaderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginLeft: 8,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyticsMainText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  analyticsSubText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  chartPlaceholder: {
    width: 96,
    height: 56,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  chartLine: {
    position: 'absolute',
    bottom: 0,
    width: 3,
    borderRadius: 1.5,
  },
  recentEntriesTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  entryCard: {
    padding: 16,
    marginBottom: 12,
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryCardDate: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '600',
  },
  entryCardTime: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  entryCardSummary: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  emotionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  loader: {
    marginTop: 50,
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
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  processingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  processingText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  fabWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  fabButton: {
    flex: 1,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
