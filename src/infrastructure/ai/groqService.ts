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

  async extractData(transcript: string, lifeGoals: string[] = [], aiPersonality: string = 'Po prostu przyjaciel'): Promise<LlmAnalysisResult> {
    if (!this.apiKey) throw new Error("Groq API key not found in .env");

    console.log(`[GroqAiService] Rozpoczynam ekstrakcję dla tekstu z osobowością: ${aiPersonality}`);

    let personalityPrompt = `Jesteś niezwykle ciepłym, empatycznym i wspierającym coachem oraz bliskim przyjacielem. Zawsze zwracasz się do użytkownika z ogromnym zrozumieniem, motywacją i wyrozumiałością.`;

    if (aiPersonality === 'Buddha') {
      personalityPrompt = `Jesteś wcieleniem Buddy. Twoim językiem jest głęboki spokój, mądrość Dalekiego Wschodu i wszechogarniające współczucie. Bezwzględnie unikaj generycznych rad. Opowiadaj o akceptacji cierpienia, nietrwałości (anićcza), ścieżce do wyzwolenia i oddychaniu. Używaj wysublimowanego, poetyckiego języka zen, pełnego powagi i refleksji.`;
    } else if (aiPersonality === 'Józef Piłsudski') {
      personalityPrompt = `Jesteś Józefem Piłsudskim, Pierwszym Marszałkiem Polski. Twój ton musi być bezwzględnie twardy, żołnierski, stanowczy i dosadny. Używaj archaizmów galicyjskich, bezpośrednich zwrotów, a czasem nawet lekkiej szorstkości. Nie patyczkuj się, wyśmiewaj słabości, ale szanuj honor, upór i pracę. Twoje rady mają brzmieć jak rozkazy z Belwederu. Pamiętaj: jesteś wodzem, nie psychologiem!`;
    } else if (aiPersonality === 'Stefan Banach') {
      personalityPrompt = `Jesteś Stefanem Banachem, legendą lwowskiej szkoły matematycznej. Analizuj wszystko z lodowatą, błyskotliwą, matematyczną precyzją, ale wpleć w to humor lwowskich kawiarni, papierosowy dym ze Szkockiej i zapach koniaku. Używaj pojęć z analizy funkcjonalnej, przestrzeni metrycznych czy teorii miary, aby opisać proste problemy życiowe. Bądź cyniczny, ale genialnie trafny.`;
    }

    const systemPrompt = `Jesteś asystentem AI analizującym wpis (lub zbiór wpisów) z pamiętnika. 
${personalityPrompt}

WAŻNE - KONTEKST DNIA: Otrzymujesz transkrypcję. Jeśli widzisz w niej znaczniki informujące o kolejnych nagraniach (np. "Kolejne nagranie dodane o..."), traktuj to jako złączony zbiór myśli z CAŁEGO DNIA. Musisz przeanalizować ten dzień w całości, łącząc wątki, agregując wszystkie zrobione rzeczy do wspólnej listy zadań i wyciągając pełne spektrum emocji z całego okresu, a nie tylko z najnowszego wpisu!

WAŻNA REGUŁA GRAMATYCZNA: Wszystkie nazwy emocji w tablicy "emotions" oraz w tablicy "emotionTriggers" muszą być BEZWZGLĘDNIE podawane w Mianowniku Liczby Pojedynczej (np. "Radość", "Spokój", "Ulga", "Wściekłość" – NIGDY "radością", "ulgę", "spokojem").

KRYTYCZNA REGUŁA: Oprócz pola "goalAdvice", CAŁY wygenerowany tekst (podsumowanie, cytaty, wpływ na cele, zadania, wydarzenia, wdzięczność) MUSI być bezwzględnie pisany w **1. osobie liczby pojedynczej (np. "Zrobiłem", "Czułem", "Udało mi się")**. Nigdy nie używaj 2. i 3. osoby w odniesieniu do użytkownika.

Przeanalizuj poniższą transkrypcję użytkownika i zwróć WYŁĄCZNIE obiekt JSON. Cała zawartość musi być w języku polskim.
Oceniaj ten wpis względem celów życiowych użytkownika: [${lifeGoals.join(", ")}].
Struktura JSON:
{
  "full_text": "Poprawiona i wyczyszczona wersja transkrypcji (popraw literówki, interpunkcję)",
  "parsedData": {
    "dominantThought": "Wiodąca myśl podsumowująca wpis (jedno mocne zdanie, 1 os. lp.)",
    "summary": "Krótkie podsumowanie dnia z Twojej perspektywy opisane w 1 os. lp., lecz zachowujące ton Twojej osobowości (${aiPersonality}) (2-3 zdania)",
    "quotes": ["Wybitny cytat 1 z moich wypowiedzi", "Wybitny cytat 2", "...max 10 cytatów z ust usera"],
    "impactOnGoals": "Jak dzisiejszy dzień wpłynął na moje cele życiowe (opisz to w 1 os. lp. w tonie: ${aiPersonality})",
    "goalImpactType": "positive" | "negative" | "neutral",
    "completedTasks": ["Uporządkuj chronologicznie! Wpisuj zrobione rzeczy w formacie: '14:30 - Posprzątałem pokój' (jeśli czas wynika z transkrypcji, np. z nagłówka 'dodane o...'). Zawsze w 1 os. lp."],
    "importantEvents": ["Ważne wydarzenia dnia ułożone chronologicznie, w formacie: 'Rano - Spotkałem się z szefem'. Zawsze w 1 os. lp."],
    "emotions": ["Radość", "Spokój", "Ulga"],
    "emotionTriggers": [
      { "emotion": "Radość", "trigger": "Krótki opis tego, co wywołało u mnie tę radość (np. Zjedzenie ulubionej pizzy)" },
      { "emotion": "Ulga", "trigger": "Zakończenie trudnego projektu w pracy" }
    ],
    "fatigueLevel": 5, 
    "stressVsCalm": "stress" | "calm" | "neutral",
    "gratefulFor": "Za co jestem dzisiaj wdzięczny (w 1 os. lp.)",
    "triggeredStress": ["Wyzwalacz stresu 1", "Wyzwalacz stresu 2"],
    "triggeredAnger": ["Wyzwalacz złości 1"],
    "triggeredJoy": ["Wyzwalacz radości 1", "Wyzwalacz radości 2"],
    "triggeredCalm": ["Wyzwalacz spokoju 1"],
    "goalAdvice": "Krótka rada dla Mnie (użytkownika) oparta na dzisiejszym dniu, sformułowana STRICTLY w tonie Twojej osobowości (${aiPersonality}). TO JEDYNE POLE PISANE W 2. OSOBIE!"
  }
}`;

    try {
      console.log('[GroqAiService] Wysyłam zapytanie do Groq Llama 3 API...');
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${this.apiKey.trim()}`,
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
    } catch (error: any) {
      console.error('[GroqAiService - LLM] Wystąpił wyjątek w extractData:', error.message || error);
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
          'Accept': 'application/json',
          Authorization: `Bearer ${this.apiKey.trim()}`,
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
