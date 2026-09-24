import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { ExpoAvAudioRecorder } from '../../infrastructure/audio/expoAudioRecorder';
import { GroqAiService } from '../../infrastructure/ai/groqService';
import { Feather } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { GradientText, GlassCard } from '../components/UIPrimitives';
import { LinearGradient } from 'expo-linear-gradient';

const audioRecorder = new ExpoAvAudioRecorder();
const aiService = new GroqAiService();

const ONBOARDING_QUESTIONS = [
  'Jaki jest Twój najważniejszy cel osobisty lub zdrowotny?',
  'Jaki jest Twój główny cel zawodowy?',
  'Nad czym chcesz pracować w sferze emocjonalnej lub w relacjach?',
];

const { width } = Dimensions.get('window');

export const OnboardingScreen = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const { setGoals, theme } = useSettingsStore();
  const colors = THEMES[theme];

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (showConfetti) {
      timeoutId = setTimeout(() => {
        setGoals(transcripts);
      }, 3500);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [showConfetti, setGoals, transcripts]);

  const handleRecordPress = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsProcessing(true);
      setError(null);
      try {
        const audioUri = await audioRecorder.stopRecording();
        if (!audioUri) throw new Error('Nie nagrano dźwięku.');

        const transcript = await aiService.transcribe(audioUri);
        if (!transcript || transcript.trim().length === 0) {
          throw new Error('Nie udało się rozpoznać mowy. Spróbuj nagrać odpowiedź jeszcze raz.');
        }

        const newTranscripts = [...transcripts, transcript];
        setTranscripts(newTranscripts);

        if (currentStep < ONBOARDING_QUESTIONS.length - 1) {
          setCurrentStep((prev) => prev + 1);
          setIsProcessing(false);
        } else {
          const combinedTranscript = newTranscripts.join('\\n\\n');
          const goals = await aiService.extractLifeGoalsFromTranscript(combinedTranscript);

          if (goals && goals.length > 0) {
            setTranscripts(goals);
            setShowConfetti(true);
          } else {
            throw new Error('Nie udało się wyodrębnić żadnych celów z Twojej wypowiedzi.');
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

  if (showConfetti) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.successIconWrapper, { shadowColor: colors.primary }]}>
            <Feather name="check" size={50} color={colors.text} />
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Twoje cele ustawione!</Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            AI przygotowało plan i będzie Cię wspierać każdego dnia.
          </Text>
        </View>
        <ConfettiCannon
          count={250}
          origin={{ x: width / 2, y: -20 }}
          colors={['#A78BFA', '#F472B6', '#60A5FA']}
          fadeOut
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[
          styles.backButton,
          {
            borderColor: colors.tileBorder,
            backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
          },
        ]}
        onPress={() => setGoals(['Chcę prowadzić pamiętnik i dbać o swój nastrój'])}
      >
        <Feather name="chevron-left" size={20} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <View
          style={[
            styles.sparkleWrapper,
            {
              borderColor: colors.tileBorder,
              backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
            },
          ]}
        >
          <Feather name="mic" size={24} color={colors.text} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Witaj w</Text>
        <GradientText text="Twoim Pamiętniku" style={styles.gradientTitle} />

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Zdefiniuj swoje {ONBOARDING_QUESTIONS.length} główne cele.
        </Text>
      </View>

      <View style={styles.questionContainer}>
        <GlassCard intensity={theme === 'AppleLight' ? 60 : 30} style={styles.card}>
          <Text style={[styles.stepIndicator, { color: colors.primary }]}>
            KROK {currentStep + 1} Z {ONBOARDING_QUESTIONS.length}
          </Text>
          <Text style={[styles.questionText, { color: colors.text }]}>{ONBOARDING_QUESTIONS[currentStep]}</Text>
        </GlassCard>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.bottomContainer}>
        {isProcessing && (
          <View
            style={[
              styles.processingPill,
              {
                borderColor: colors.tileBorder,
                backgroundColor: theme === 'AppleLight' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
              },
            ]}
          >
            <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.processingText, { color: colors.text }]}>
              {currentStep === ONBOARDING_QUESTIONS.length - 1 ? 'Analizuję Twoje cele...' : 'Przetwarzam...'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleRecordPress}
          style={styles.fabWrapper}
          disabled={isProcessing}
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
    padding: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 10,
    zIndex: 10,
  },
  sparkleWrapper: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  gradientTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 24,
  },
  questionContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    padding: 30,
    alignItems: 'center',
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A78BFA',
    letterSpacing: 2,
    marginBottom: 16,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
  },
  bottomContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  processingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  processingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  errorText: {
    color: '#FCA5A5',
    textAlign: 'center',
    fontSize: 14,
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
  },
  successIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(167, 139, 250, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
});
