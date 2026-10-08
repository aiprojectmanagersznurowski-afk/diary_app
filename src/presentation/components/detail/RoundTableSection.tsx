import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GlassCard, SectionLabel, useTheme } from '../ui';
import { DilemmaAdvisory } from '../../../domain/models/DilemmaAdvisory';
import { IDilemmaAdvisoryRepository } from '../../../domain/repositories/IDilemmaAdvisoryRepository';
import { useSettingsStore } from '../../../application/store/useSettingsStore';

interface RoundTableSectionProps {
  documentId: string;
  repository: IDilemmaAdvisoryRepository;
}

export const RoundTableSection: React.FC<RoundTableSectionProps> = ({ documentId, repository }) => {
  const { colors } = useTheme();
  const roundTableMembers = useSettingsStore((s) => s.roundTableMembers);

  const [advisory, setAdvisory] = useState<DilemmaAdvisory | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [decisionInput, setDecisionInput] = useState('');
  const [savedDecision, setSavedDecision] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    repository
      .getAdvisory(documentId)
      .then((data) => {
        if (isMounted && data) {
          setAdvisory(data);
          if (data.userDecision) {
            setSavedDecision(data.userDecision);
          }
        }
      })
      .catch((err) => {
        console.warn('Błąd pobierania rekomendacji stołu:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [documentId, repository]);

  const handleRequestAdvisory = async () => {
    setLoading(true);
    try {
      const res = await repository.requestAdvisory(documentId, roundTableMembers);
      setAdvisory(res);
      if (res.userDecision) {
        setSavedDecision(res.userDecision);
      }
    } catch (err: any) {
      Alert.alert('Błąd', err?.message || 'Nie udało się uzyskać rekomendacji Okrągłego stołu.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDecision = async () => {
    if (!decisionInput.trim()) return;
    setSubmitting(true);
    try {
      await repository.saveUserDecision(documentId, decisionInput.trim());
      setSavedDecision(decisionInput.trim());
      setDecisionInput('');
      Alert.alert('Zapisano', 'Twoja decyzja została dołączona do historii dylematów (DILEMMAS.md).');
    } catch (err: any) {
      Alert.alert('Błąd', err?.message || 'Nie udało się zapisać decyzji.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCallHelpline = (phone: string) => {
    const cleaned = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      Alert.alert('Numer telefonu', `Zadzwoń pod numer: ${phone}`);
    });
  };

  return (
    <View style={styles.container}>
      <SectionLabel style={styles.sectionTitle}>Okrągły stół (Doradztwo dla dylematu)</SectionLabel>

      {/* Jeśli brak doradztwa i nie ładuje */}
      {!advisory && !loading ? (
        <GlassCard padding={16} style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <View style={[styles.iconCircle, { backgroundColor: colors.segOn }]}>
              <Feather name="users" size={20} color={colors.primary} />
            </View>
            <View style={styles.promptTextContainer}>
              <Text style={[styles.promptTitle, { color: colors.text }]}>Skonsultuj dylemat z Okrągłym stołem</Text>
              <Text style={[styles.promptDesc, { color: colors.textSecondary }]}>
                Wybrane przez Ciebie perspektywy zanalizują ten wybór z różnych stron i pomogą znaleźć sedno problemu.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleRequestAdvisory}
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
          >
            <Feather name="compass" size={16} color={colors.onPrimary} style={{ marginRight: 8 }} />
            <Text style={[styles.primaryActionBtnText, { color: colors.onPrimary }]}>Zapytaj Okrągły stół</Text>
          </Pressable>
        </GlassCard>
      ) : null}

      {/* Stan ładowania */}
      {loading ? (
        <GlassCard padding={20} style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Doradcy przy Okrągłym stole debatują...</Text>
          <Text style={[styles.loadingSub, { color: colors.textSecondary }]}>
            Analizujemy Twoje wartości, cele i możliwe ścieżki wyboru.
          </Text>
        </GlassCard>
      ) : null}

      {/* Sytuacja kryzysowa */}
      {advisory?.crisisDetected ? (
        <GlassCard padding={16} style={[styles.crisisCard, { borderColor: colors.border }]}>
          <View style={styles.crisisHeader}>
            <Feather name="alert-triangle" size={24} color={colors.primary} />
            <Text style={[styles.crisisTitle, { color: colors.primary }]}>Ważna informacja o wsparciu</Text>
          </View>
          <Text style={[styles.crisisMsg, { color: colors.text }]}>{advisory.crisisMessage}</Text>

          {advisory.helplines?.map((hl, idx) => (
            <Pressable
              key={`${hl.phone}-${idx}`}
              onPress={() => handleCallHelpline(hl.phone)}
              style={[styles.helplineRow, { borderColor: colors.border, backgroundColor: colors.card2 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.helplineName, { color: colors.text }]}>{hl.name}</Text>
                <Text style={[styles.helplineDesc, { color: colors.textSecondary }]}>{hl.description}</Text>
              </View>
              <View style={[styles.phoneBadge, { backgroundColor: colors.primary }]}>
                <Feather name="phone" size={12} color={colors.onPrimary} style={{ marginRight: 4 }} />
                <Text style={[styles.phoneBadgeText, { color: colors.onPrimary }]}>{hl.phone}</Text>
              </View>
            </Pressable>
          ))}
        </GlassCard>
      ) : null}

      {/* Karty rekomendacji doradców */}
      {advisory && !advisory.crisisDetected ? (
        <View style={styles.advisoryContent}>
          {advisory.recommendations.map((rec, idx) => (
            <GlassCard key={`${rec.personaId}-${idx}`} padding={16} style={styles.personaCard}>
              <View style={styles.personaHeader}>
                <View style={[styles.personaBadge, { backgroundColor: colors.card2 }]}>
                  <Text style={[styles.personaName, { color: colors.primary }]}>{rec.personaName}</Text>
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={[styles.blockLabel, { color: colors.textSecondary }]}>SEDNO DYLEMATU</Text>
                <Text style={[styles.blockText, { color: colors.text }]}>{rec.angle}</Text>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={[styles.blockLabel, { color: colors.textSecondary }]}>REKOMENDACJA</Text>
                <Text style={[styles.blockText, { color: colors.text }]}>{rec.recommendation}</Text>
              </View>

              <View style={[styles.nextStepBox, { backgroundColor: colors.card2, borderColor: colors.border }]}>
                <Feather name="arrow-right-circle" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.nextStepText, { color: colors.text }]}>
                  <Text style={{ fontWeight: '700' }}>Kolejny krok: </Text>
                  {rec.nextStep}
                </Text>
              </View>
            </GlassCard>
          ))}

          {/* Karta syntezy Narratora */}
          {advisory.narratorSynthesis ? (
            <GlassCard padding={16} style={[styles.synthesisCard, { borderColor: colors.primary }]}>
              <View style={styles.synthesisHeader}>
                <Feather name="feather" size={18} color={colors.primary} />
                <Text style={[styles.synthesisTitle, { color: colors.text }]}>Synteza Narratora</Text>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={[styles.blockLabel, { color: colors.textSecondary }]}>W CZYM STÓŁ SIĘ ZGADZA</Text>
                <Text style={[styles.blockText, { color: colors.text }]}>{advisory.narratorSynthesis.consensus}</Text>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={[styles.blockLabel, { color: colors.textSecondary }]}>PUNKT NAPIĘCIA / RÓŻNICA</Text>
                <Text style={[styles.blockText, { color: colors.text }]}>{advisory.narratorSynthesis.divergence}</Text>
              </View>

              <View style={[styles.questionBox, { backgroundColor: colors.card2 }]}>
                <Text style={[styles.questionLabel, { color: colors.primary }]}>KLUCZOWE PYTANIE DLA CIEBIE:</Text>
                <Text style={[styles.questionText, { color: colors.text }]}>
                  {advisory.narratorSynthesis.keyQuestion}
                </Text>
              </View>

              <Text style={[styles.narratorAdviceText, { color: colors.textSecondary }]}>
                „{advisory.narratorSynthesis.narratorAdvice}”
              </Text>
            </GlassCard>
          ) : null}

          {/* Sekcja zapisu decyzji */}
          <GlassCard padding={16} style={styles.decisionCard}>
            <Text style={[styles.decisionCardTitle, { color: colors.text }]}>Twoja decyzja</Text>
            {savedDecision ? (
              <View style={[styles.savedDecisionBox, { backgroundColor: colors.segOn, borderColor: colors.primary }]}>
                <View style={styles.savedDecisionHeader}>
                  <Feather name="check-circle" size={16} color={colors.primary} />
                  <Text style={[styles.savedDecisionHeaderText, { color: colors.primary }]}>
                    Podjęta decyzja zapisana
                  </Text>
                </View>
                <Text style={[styles.savedDecisionBody, { color: colors.text }]}>{savedDecision}</Text>
              </View>
            ) : (
              <View>
                <Text style={[styles.decisionDesc, { color: colors.textSecondary }]}>
                  Gdy przemyślisz głosy doradców, zapisz swój ostateczny wybór. Zostanie dodany do pliku DILEMMAS.md.
                </Text>
                <TextInput
                  value={decisionInput}
                  onChangeText={setDecisionInput}
                  placeholder="Co wybierasz i jaki krok podejmujesz?"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  style={[
                    styles.decisionInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.card2,
                      borderColor: colors.border,
                    },
                  ]}
                />
                <Pressable
                  onPress={handleSaveDecision}
                  disabled={submitting || !decisionInput.trim()}
                  style={[
                    styles.saveDecisionBtn,
                    {
                      backgroundColor: decisionInput.trim() ? colors.primary : colors.card2,
                      opacity: submitting ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.saveDecisionBtnText,
                      { color: decisionInput.trim() ? colors.onPrimary : colors.textSecondary },
                    ]}
                  >
                    {submitting ? 'Zapisuję...' : 'Zapisz moją decyzję'}
                  </Text>
                </Pressable>
              </View>
            )}
          </GlassCard>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  promptCard: {
    paddingVertical: 18,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTextContainer: {
    flex: 1,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  promptDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  loadingSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  crisisCard: {
    borderWidth: 1.5,
  },
  crisisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  crisisTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  crisisMsg: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  helplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  helplineName: {
    fontSize: 13,
    fontWeight: '600',
  },
  helplineDesc: {
    fontSize: 11,
    lineHeight: 14,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  phoneBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  advisoryContent: {
    gap: 12,
  },
  personaCard: {
    marginBottom: 2,
  },
  personaHeader: {
    marginBottom: 10,
  },
  personaBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  personaName: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionBlock: {
    marginBottom: 10,
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  blockText: {
    fontSize: 13,
    lineHeight: 18,
  },
  nextStepBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  nextStepText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  synthesisCard: {
    borderWidth: 1.5,
    marginTop: 6,
  },
  synthesisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  synthesisTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  questionBox: {
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
  },
  questionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  questionText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  narratorAdviceText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 6,
  },
  decisionCard: {
    marginTop: 6,
  },
  decisionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  decisionDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  decisionInput: {
    minHeight: 70,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  saveDecisionBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveDecisionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  savedDecisionBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  savedDecisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  savedDecisionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  savedDecisionBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});
