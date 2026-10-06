import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSettingsStore } from '../../application/store/useSettingsStore';
import { useAuthStore } from '../../application/store/useAuthStore';
import { useOnboardingServices } from '../../composition/context';
import {
  ScreenContainer,
  GlassCard,
  GradientText,
  Chip,
  PrimaryButton,
  RecordButton,
  useTheme,
  formatTimer,
  ACCENTS,
  ERROR_BORDER,
  ERROR_SURFACE,
  STATUS_TEXT,
} from '../components/ui';
import { pl } from '../i18n/pl';

const QUESTIONS = pl.onboarding.questions;

export const OnboardingScreen = () => {
  const { audioRecorder, aiService, profileService } = useOnboardingServices();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [goals, setGoalsList] = useState<string[] | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { setGoals, theme, aiPersonality } = useSettingsStore();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isRecording) return undefined;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const saveGoals = useCallback(
    async (finalGoals: string[]) => {
      const user = useAuthStore.getState().user;
      const timezone =
        typeof Intl !== 'undefined' && Intl.DateTimeFormat
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
          : 'UTC';

      if (user) {
        try {
          await profileService.completeOnboarding({
            userId: user.id,
            lifeGoals: finalGoals,
            aiPersonality,
            theme,
            timezone,
          });
        } catch (err) {
          console.warn('Failed to save profile during onboarding', err);
        }
      }
      setGoals(finalGoals);
    },
    [profileService, aiPersonality, theme, setGoals],
  );

  const handleSkip = async () => {
    setIsSaving(true);
    await saveGoals([pl.onboarding.defaultGoal]);
  };

  const handleStart = async () => {
    if (!goals) return;
    setIsSaving(true);
    await saveGoals(goals);
  };

  const handleRecordPress = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);
      setError(null);
      try {
        const audioUri = await audioRecorder.stopRecording();
        if (!audioUri) throw new Error(pl.onboarding.errorNoAudio);

        const transcript = await aiService.transcribe(audioUri);
        if (!transcript || transcript.trim().length === 0) {
          throw new Error(pl.onboarding.errorNoSpeech);
        }

        const newAnswers = [...answers, transcript];
        setAnswers(newAnswers);

        if (currentStep < QUESTIONS.length - 1) {
          setCurrentStep((prev) => prev + 1);
          setIsProcessing(false);
        } else {
          const extracted = await aiService.extractLifeGoalsFromTranscript(newAnswers.join('\n\n'));
          if (extracted && extracted.length > 0) {
            setGoalsList(extracted);
            setIsProcessing(false);
          } else {
            throw new Error(pl.onboarding.errorNoGoals);
          }
        }
      } catch (err) {
        setError(String(err));
        setIsProcessing(false);
      }
    } else {
      setIsRecording(true);
      setError(null);
      try {
        await audioRecorder.startRecording();
      } catch (err) {
        setIsRecording(false);
        setError(String(err));
      }
    }
  };

  const isLastStep = currentStep === QUESTIONS.length - 1;

  return (
    <ScreenContainer paddingHorizontal={20} style={styles.main}>
      <View style={styles.header}>
        <Text style={[styles.hello, { color: colors.text }]}>{pl.onboarding.hello}</Text>
        <GradientText text={pl.onboarding.appName} style={styles.appName} />
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {pl.onboarding.subtitle(QUESTIONS.length)}
        </Text>
      </View>

      {goals ? (
        <GlassCard style={styles.card} padding={24}>
          <View style={styles.successCircle}>
            <Feather name="check" size={32} color={STATUS_TEXT} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>{pl.onboarding.goalsSet}</Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            {pl.onboarding.goalsSetSubtitle}
          </Text>
          <View style={styles.goalChips}>
            {goals.map((goal) => (
              <Chip key={goal} label={goal} />
            ))}
          </View>
          <View style={styles.fullWidth}>
            <PrimaryButton label={pl.onboarding.start} onPress={handleStart} loading={isSaving} />
          </View>
        </GlassCard>
      ) : (
        <GlassCard style={styles.card} padding={24}>
          <Text style={[styles.step, { color: colors.primary }]}>
            {pl.onboarding.stepLabel(currentStep + 1, QUESTIONS.length)}
          </Text>
          <Text style={[styles.question, { color: colors.text }]}>{QUESTIONS[currentStep]}</Text>

          <View style={styles.recordArea}>
            {isProcessing ? (
              <View style={styles.processing}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.processingText, { color: colors.text }]}>
                  {isLastStep ? pl.onboarding.analyzing : pl.onboarding.processing}
                </Text>
              </View>
            ) : (
              <>
                <RecordButton isRecording={isRecording} onPress={handleRecordPress} size={96} />
                {isRecording ? (
                  <>
                    <Text style={styles.timer}>{pl.onboarding.recording(formatTimer(seconds))}</Text>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>{pl.onboarding.tapToStop}</Text>
                  </>
                ) : (
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>{pl.onboarding.tapToRecord}</Text>
                )}
              </>
            )}
          </View>

          <View style={styles.dots}>
            {QUESTIONS.map((q, i) => (
              <View
                key={q}
                style={[styles.dot, { backgroundColor: i <= currentStep ? colors.primary : colors.track }]}
              />
            ))}
          </View>
        </GlassCard>
      )}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!goals ? (
        <Pressable
          onPress={handleSkip}
          disabled={isSaving || isProcessing || isRecording}
          style={styles.skip}
          accessibilityRole="button"
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>{pl.onboarding.skip}</Text>
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  main: { paddingTop: 72, gap: 22 },
  header: { gap: 2 },
  hello: { fontSize: 22, fontWeight: '700' },
  appName: { fontSize: 38, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 24, marginTop: 6 },
  card: { alignItems: 'center' },
  step: { fontSize: 12, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  question: { fontSize: 19, fontWeight: '700', lineHeight: 26, letterSpacing: -0.2, textAlign: 'center', marginTop: 8 },
  recordArea: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 18 },
  hint: { fontSize: 13 },
  timer: { color: ACCENTS.error, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  processing: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  processingText: { fontSize: 15, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 10, justifyContent: 'center' },
  dot: { width: 22, height: 4, borderRadius: 2 },
  errorBox: {
    backgroundColor: ERROR_SURFACE,
    borderColor: ERROR_BORDER,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  errorText: { color: ACCENTS.error, textAlign: 'center', fontSize: 14 },
  skip: { alignSelf: 'center', padding: 12, minHeight: 44, justifyContent: 'center' },
  skipText: { fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACCENTS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    alignSelf: 'center',
  },
  successTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center', lineHeight: 25 },
  successSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginTop: 2, marginBottom: 12 },
  goalChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  fullWidth: { alignSelf: 'stretch', marginTop: 14 },
});
