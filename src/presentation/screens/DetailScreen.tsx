import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { DetailScreenRouteProp, DetailScreenNavigationProp } from '../../navigation/types';
import { useSettingsStore } from '../../application/store/useSettingsStore';
import { useDiaryStore } from '../../application/store/useDiaryStore';
import { useNotesStore } from '../../application/store/useNotesStore';
import { useRelatedThoughtsStore } from '../../application/store/useRelatedThoughtsStore';
import { getDocumentUseCase } from '../../composition';
import { AnyDocument } from '../../domain/repositories/IDocumentRepository';
import { ACCENTS, BackButton, ScreenContainer, useTheme } from '../components/ui';
import { DailyDetail, NoteDetail } from '../components/detail';
import { pl } from '../i18n/pl';

/** Szczegóły dokumentu: wpis dnia (§2.6) albo notatka (§2.7), wczytywane z `documents` po UUID. */
export const DetailScreen = () => {
  const route = useRoute<DetailScreenRouteProp>();
  const navigation = useNavigation<DetailScreenNavigationProp>();
  const { colors } = useTheme();

  const [doc, setDoc] = useState<AnyDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const lifeGoals = useSettingsStore((s) => s.lifeGoals);
  const aiPersonality = useSettingsStore((s) => s.aiPersonality);
  const notes = useNotesStore((s) => s.notes);
  const recordings = useNotesStore((s) => s.recordings);
  const dailyDocuments = useDiaryStore((s) => s.dailyDocuments);
  const fetchDailyDocuments = useDiaryStore((s) => s.fetchDailyDocuments);

  const relatedItems = useRelatedThoughtsStore((s) => s.items);
  const relatedLoading = useRelatedThoughtsStore((s) => s.isLoading);
  const relatedError = useRelatedThoughtsStore((s) => s.error);
  const loadRelatedThoughts = useRelatedThoughtsStore((s) => s.loadRelatedThoughts);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    getDocumentUseCase
      .execute(route.params.entryId)
      .then((result) => {
        if (!cancelled) setDoc(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    void loadRelatedThoughts(route.params.entryId);

    return () => {
      cancelled = true;
    };
  }, [route.params.entryId, loadRelatedThoughts]);

  // Notatka otwarta z grafu/czatu: wpis dnia może nie być jeszcze załadowany.
  useEffect(() => {
    if (doc?.kind === 'note' && dailyDocuments.length === 0) void fetchDailyDocuments();
  }, [doc, dailyDocuments.length, fetchDailyDocuments]);

  const open = (documentId: string) => navigation.push('Detail', { entryId: documentId });
  const related = { items: relatedItems, isLoading: relatedLoading, error: relatedError };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (loadError || !doc) {
    return (
      <ScreenContainer>
        <View style={styles.back}>
          <BackButton />
        </View>
        <Text style={[styles.error, { color: ACCENTS.error }]}>{loadError || pl.detail.notFound}</Text>
      </ScreenContainer>
    );
  }

  if (doc.kind === 'note') {
    return (
      <NoteDetail
        note={doc}
        daily={dailyDocuments.find((d) => d.day === doc.day)}
        recordings={recordings}
        related={related}
        onOpen={open}
      />
    );
  }

  return (
    <DailyDetail daily={doc} goals={lifeGoals} voice={aiPersonality} notes={notes} related={related} onOpen={open} />
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { marginBottom: 14 },
  error: { textAlign: 'center', fontSize: 14, paddingVertical: 30, paddingHorizontal: 10 },
});
