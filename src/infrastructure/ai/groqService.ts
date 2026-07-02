import * as FileSystem from 'expo-file-system/legacy';
import { IAiService, LlmAnalysisResult } from '../../domain/services/IAiService';

export class GroqAiService implements IAiService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
  }

  async transcribe(audioUri: string): Promise<string> {
    if (!this.apiKey) throw new Error("Groq API key not found in .env");

    console.log('[GroqAiService] Rozpoczynam transkrypcję audio z URI:', audioUri);

    try {
      console.log('[GroqAiService] Wysyłam zapytanie do Groq Whisper API (expo-file-system)...');
      
      const response = await FileSystem.uploadAsync(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        audioUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: 'audio/m4a',
          parameters: {
            model: 'whisper-large-v3',
            language: 'pl', // Wymuszamy język polski dla lepszej dokładności
          },
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (response.status !== 200) {
        console.error('[GroqAiService - Transcription] Błąd HTTP:', response.status, response.body);
        throw new Error(`Transcription failed: ${response.status} - ${response.body}`);
      }

      const data = JSON.parse(response.body);
      console.log('[GroqAiService] Transkrypcja zakończona sukcesem.');
      return data.text;
    } catch (error) {
      console.error('[GroqAiService - Transcription] Wystąpił wyjątek:', error);
      throw error;
    }
  }

  async extractData(transcript: string, lifeGoals: string[] = []): Promise<LlmAnalysisResult> {
    if (!this.apiKey) throw new Error("Groq API key not found in .env");

    console.log('[GroqAiService] Rozpoczynam ekstrakcję danych LLM dla tekstu:', transcript.substring(0, 50) + '...');

    const systemPrompt = `Jesteś asystentem AI analizującym wpis z pamiętnika. 
Jesteś niezwykle ciepłym, empatycznym i wspierającym coachem oraz bliskim przyjacielem.
Zawsze zwracasz się do użytkownika z ogromnym zrozumieniem, motywacją i wyrozumiałością.
Przeanalizuj poniższą transkrypcję użytkownika i zwróć WYŁĄCZNIE obiekt JSON. Cała zawartość musi być w języku polskim.
Oceniaj ten wpis względem celów życiowych użytkownika: [${lifeGoals.join(", ")}].
Struktura JSON:
{
  "full_text": "Poprawiona i wyczyszczona wersja transkrypcji (popraw literówki, interpunkcję)",
  "parsedData": {
    "dominantThought": "Wiodąca myśl podsumowująca wpis (jedno mocne zdanie)",
    "summary": "Krótkie, ciepłe podsumowanie dnia z perspektywy słuchającego przyjaciela (2-3 zdania)",
    "quotes": ["Wybitny cytat 1 z wypowiedzi", "Wybitny cytat 2", "...max 10 cytatów z ust usera"],
    "impactOnGoals": "Jak dzisiejszy dzień wpływa na cele życiowe (ciepłym, empatycznym tonem)",
    "goalImpactType": "positive" | "negative" | "neutral",
    "completedTasks": ["Zrobiona rzecz 1", "Zrobiona rzecz 2"],
    "emotions": ["Radość", "Spokój", "Złość"],
    "fatigueLevel": 5, 
    "stressVsCalm": "stress" | "calm" | "neutral",
    "gratefulFor": "Za co user jest wdzięczny w tym wpisie (lub co dobrego go spotkało)",
    "triggeredStress": "Co wywołało stres lub null jeśli brak",
    "triggeredAnger": "Co wywołało złość lub null",
    "triggeredJoy": "Co wywołało radość lub null",
    "triggeredCalm": "Co wywołało spokój lub null",
    "goalAdvice": "Krótka, empatyczna rada (od coacha/przyjaciela) dla użytkownika oparta na jego dzisiejszym dniu i wyznaczonych celach życiowych (lub null, jeśli brak powiązania z celami)"
  }
}`;

    try {
      console.log('[GroqAiService] Wysyłam zapytanie do Groq Llama 3 API...');
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[GroqAiService - LLM] Błąd HTTP:', response.status, errText);
        throw new Error(`Data extraction failed: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      console.log('[GroqAiService] Ekstrakcja LLM zakończona sukcesem.');
      return JSON.parse(content) as LlmAnalysisResult;
    } catch (error) {
      console.error('[GroqAiService - LLM] Wystąpił wyjątek:', error);
      throw error;
    }
  }

  async extractLifeGoalsFromTranscript(transcript: string): Promise<string[]> {
    if (!this.apiKey) throw new Error("Groq API key not found in .env");

    console.log('[GroqAiService] Rozpoczynam ekstrakcję celów życiowych dla tekstu:', transcript.substring(0, 50) + '...');

    const systemPrompt = `Jesteś asystentem AI profilującym użytkownika.
Przeanalizuj poniższą wypowiedź użytkownika o jego wartościach, planach i wyzwaniach, a następnie wyodrębnij z niej najważniejsze cele życiowe.
Sformułuj je kategorycznie, krótko (3-5 słów każdy), jako konkretne cele lub wartości.
Musisz zwrócić WYŁĄCZNIE obiekt JSON. Cała zawartość musi być w języku polskim.
Struktura JSON:
{
  "goals": ["Cel 1", "Cel 2", "Cel 3"]
}`;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcript },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[GroqAiService - LLM Goals] Błąd HTTP:', response.status, errText);
        throw new Error(`Goals extraction failed: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      console.log('[GroqAiService] Ekstrakcja celów zakończona sukcesem.');
      const parsed = JSON.parse(content);
      return parsed.goals || [];
    } catch (error) {
      console.error('[GroqAiService - LLM Goals] Wystąpił wyjątek:', error);
      throw error;
    }
  }
}
