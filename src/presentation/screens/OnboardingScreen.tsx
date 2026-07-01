import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSettingsStore, THEMES } from '../../application/store/useSettingsStore';
import { RecordButton } from '../components/RecordButton';
import { ExpoAvAudioRecorder } from '../../infrastructure/audio/expoAudioRecorder';
import { GroqAiService } from '../../infrastructure/ai/groqService';
import { Feather } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';

const audioRecorder = new ExpoAvAudioRecorder();
const aiService = new GroqAiService();

const ONBOARDING_QUESTIONS = [
  "Jakie masz cele na ten rok?",
  "Co jest dla Ciebie ważne w życiu?",
  "Jak lubisz spędzać czas?",
  "Jak chciałbyś się rozwijać jako człowiek i karierowo?",
  "Nad czym pracujesz w sferze emocjonalnej?"
];

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
        setGoals(transcripts); // Just setting some placeholder to trigger navigation in App.tsx
      }, 3000);
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
        if (!audioUri) throw new Error("Nie nagrano dźwięku.");
        
        const transcript = await aiService.transcribe(audioUri);
        const newTranscripts = [...transcripts, transcript];
        setTranscripts(newTranscripts);
        
        if (currentStep < ONBOARDING_QUESTIONS.length - 1) {
          setCurrentStep(prev => prev + 1);
          setIsProcessing(false);
        } else {
          // Final step
          const combinedTranscript = newTranscripts.join('\n\n');
          const goals = await aiService.extractLifeGoalsFromTranscript(combinedTranscript);
          
          if (goals && goals.length > 0) {
            setTranscripts(goals); // We store goals in transcripts just to pass it to setGoals later
            setShowConfetti(true);
          } else {
            throw new Error("Nie udało się wyodrębnić żadnych celów z Twojej wypowiedzi.");
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
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Feather name="check-circle" size={80} color={colors.primary} style={{ marginBottom: 20 }} />
        <Text style={[styles.title, { color: colors.text, textAlign: 'center' }]}>Gotowe!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
          Twoje cele zostały zapisane.
        </Text>
        <ConfettiCannon count={200} origin={{x: -10, y: 0}} colors={colors.gradientColors as unknown as string[]} fadeOut />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Feather name="mic" size={40} color={colors.primary} style={styles.icon} />
        <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>
          Krok {currentStep + 1} z {ONBOARDING_QUESTIONS.length}
        </Text>
      </View>

      <View style={styles.questionContainer}>
        <Text style={[styles.title, { color: colors.text, textAlign: 'center' }]}>
          {ONBOARDING_QUESTIONS[currentStep]}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.bottomContainer}>
        {isProcessing && (
          <View style={[styles.processingPill, { backgroundColor: colors.tileBorder }]}>
            <ActivityIndicator size="small" color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.processingText, { color: colors.text }]}>
              {currentStep === ONBOARDING_QUESTIONS.length - 1 ? 'Analizuję Twoje cele...' : 'Przetwarzam...'}
            </Text>
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
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
  },
  icon: {
    marginBottom: 10,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  questionContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 15,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  processingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    padding: 15,
    borderRadius: 10,
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
  },
  errorText: {
    color: '#F87171',
    textAlign: 'center',
  }
});
