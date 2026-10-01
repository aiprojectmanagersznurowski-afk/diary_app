import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useGraphStore } from '../../application/store/useGraphStore';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { ForceGraphView } from '../components/graph';
import { GraphScreenNavigationProp } from '../../navigation/types';

export const GraphScreen: React.FC = () => {
  const navigation = useNavigation<GraphScreenNavigationProp>();
  const { theme } = useSettingsStore();
  const colors = THEMES[theme];

  const { data, isLoading, error, fetchGraph } = useGraphStore();

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      navigation.navigate('Detail', { entryId: nodeId });
    },
    [navigation],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.tileBorder }]}>
        <TouchableOpacity
          style={[
            styles.headerButton,
            { backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' },
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Graf wiedzy</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {data.nodes.length} węzłów · {data.links.length} powiązań
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.headerButton,
            { backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' },
          ]}
          onPress={() => fetchGraph()}
          disabled={isLoading}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="rotate-cw" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {isLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Ładowanie grafu...</Text>
          </View>
        )}

        {!isLoading && error && (
          <View style={styles.centerContainer}>
            <Feather name="alert-circle" size={40} color="#EF4444" />
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchGraph()}>
              <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !error && data.nodes.length === 0 && (
          <View style={styles.centerContainer}>
            <Feather name="share-2" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Twój graf jest pusty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Nagraj swoje pierwsze myśli lub utwórz notatki, a automatycznie pojawią się w grafie powiązań.
            </Text>
          </View>
        )}

        {!isLoading && !error && data.nodes.length > 0 && <ForceGraphView data={data} onNodeClick={handleNodeClick} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
