import { AiProviders } from '../_shared/ai/factory.ts';
import { LlmMessage } from '../_shared/ai/types.ts';
import { cleanJsonString } from '../_shared/ai/validate.ts';
import { loadPersonalityPrompt, normalizePersonalityKey } from '../_shared/prompts/personalityLoader.ts';
import { PersonaRecommendation, NarratorSynthesis, RoundTableResult, UserContextFileRow } from './types.ts';

const PERSONA_DISPLAY_NAMES: Record<string, string> = {
  friend: 'Po prostu przyjaciel',
  banach: 'Stefan Banach',
  buddha: 'Buddha',
  pilsudski: 'Józef Piłsudski',
  deida: 'David Deida',
  huberman: 'Andrew Huberman',
};

export function getPersonaDisplayName(key: string): string {
  const norm = normalizePersonalityKey(key);
  return PERSONA_DISPLAY_NAMES[norm] || key;
}

export function formatUserContext(files: UserContextFileRow[]): string {
  if (!files || files.length === 0) {
    return 'Brak dodatkowych plików kontekstu o użytkowniku.';
  }

  return files.map((file) => `### Plik: ${file.filename}\n${file.content.trim()}`).join('\n\n');
}

export interface OrchestrateOptions {
  dilemmaText: string;
  members: string[];
  narratorKey?: string;
  contextFiles: UserContextFileRow[];
  aiProviders: AiProviders;
}

export async function orchestrateRoundTable({
  dilemmaText,
  members,
  narratorKey = 'friend',
  contextFiles,
  aiProviders,
}: OrchestrateOptions): Promise<RoundTableResult> {
  const contextStr = formatUserContext(contextFiles);
  const normalizedMembers = (members.length > 0 ? members : ['deida', 'huberman']).map(normalizePersonalityKey);

  // 1. Równoległe generowanie perspektyw doradców przy Okrągłym stole
  const recommendations: PersonaRecommendation[] = await Promise.all(
    normalizedMembers.map(async (memberKey) => {
      const personaPrompt = await loadPersonalityPrompt(memberKey);
      const personaName = getPersonaDisplayName(memberKey);

      const systemPrompt = `Jesteś doradcą przy Okrągłym stole w aplikacji Vocaly.
Twoja rola: reprezentujesz najwyższy poziom intelektu, przenikliwości i głębi życiowej. Jesteś bezkompromisowy wobec powierzchownych rad, pustych frazesów i taniego coachingu.

Zasady Twojej unikalnej perspektywy i stylu wypowiedzi:
${personaPrompt}

Kontekst użytkownika (wartości, cele, nawyki i dotychczasowe decyzje):
${contextStr}

Instrukcje dotyczące analizy dylematu:
1. Odpowiedz na dylemat użytkownika ze swojej unikalnej, wyrazistej perspektywy.
2. Odnieś się wprost do wartości i celów użytkownika podanych w kontekście, jeśli mają znaczenie dla tego wyboru.
3. Twoja odpowiedź musi być w formacie JSON i zawierać dokładnie 3 pola:
   - "angle": sedno dylematu, ukryte motywy i psychologiczne napięcie z Twojej perspektywy (o co tu NAPRAWDĘ chodzi pod powierzchnią wyboru?),
   - "recommendation": Twoja odważna, konkretna i nieoczywista rekomendacja decyzyjna (bez ogólników i bez unikania zajęcia stanowiska),
   - "nextStep": jeden konkretny, precyzyjny mikro-eksperyment lub krok do wykonania w ciągu 24-48 godzin, który przyniesie natychmiastową jasność.
Pamiętaj: jeśli opierasz się na publicznych ideach (Deida / Huberman), wypowiadaj się w 3. osobie i bezwzględnie nie udzielaj porad medycznych/farmakologicznych.
Zwróć WYŁĄCZNIE poprawny obiekt JSON.`;

      const messages: LlmMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Oto mój dylemat decyzyjny:\n"${dilemmaText}"\n\nPrzeanalizuj go dogłębnie ze swojej perspektywy i zwróć odpowiedź w formacie JSON.`,
        },
      ];

      try {
        const rawRes = await aiProviders.chat.generateText(messages, {
          responseFormat: 'json',
          temperature: 0.6,
        });

        const cleaned = cleanJsonString(rawRes);
        const parsed = JSON.parse(cleaned);
        return {
          personaId: memberKey,
          personaName,
          angle: parsed.angle || `Analiza dylematu z perspektywy: ${personaName}.`,
          recommendation: parsed.recommendation || 'Podejmij decyzję w zgodzie ze swoimi najważniejszymi wartościami.',
          nextStep: parsed.nextStep || 'Zapisz swoje wnioski i zrób mały krok testowy.',
        };
      } catch (err) {
        console.warn(`Błąd generowania perspektywy doradcy ${memberKey}:`, err);
        return {
          personaId: memberKey,
          personaName,
          angle: `Perspektywa ${personaName}.`,
          recommendation: 'Skup się na swoich najważniejszych wartościach i przemyśl kolejny ruch.',
          nextStep: 'Zapisz swoje odczucia po wysłuchaniu różnych stron.',
        };
      }
    }),
  );

  // 2. Synteza Narratora (Główna perspektywa użytkownika)
  const normNarrator = normalizePersonalityKey(narratorKey);
  const narratorPrompt = await loadPersonalityPrompt(normNarrator);

  const advisorOutputsText = recommendations
    .map(
      (r) => `[Doradca: ${r.personaName}]\nSedno: ${r.angle}\nRekomendacja: ${r.recommendation}\nKrok: ${r.nextStep}`,
    )
    .join('\n\n');

  const synthesisSystemPrompt = `Jesteś głównym Narratorem w aplikacji Vocaly.
Łączysz mądrość wszystkich doradców w spójną całość, pomagając użytkownikowi zobaczyć pełny obraz sytuacji.
Twój styl i filtr poznawczy:
${narratorPrompt}

Kontekst użytkownika:
${contextStr}

Twoje zadanie:
Wysłuchałeś wypowiedzi doradców przy Okrągłym stole i przygotowujesz dla użytkownika mistrzowską, wyrazistą syntezę dylematu.
Zwróć obiekt JSON z polami:
- "consensus": w czym doradcy są фундаментално zgodni i co stanowi niezaprzeczalny punkt wyjścia,
- "divergence": gdzie pojawia się kluczowe napięcie, spór wartości lub konflikt filozofii życiowych między doradcami,
- "keyQuestion": jedno najcelniejsze pytanie sokratejskie, które użytkownik musi sobie szczerze zadać przed ostatecznym wyborem,
- "narratorAdvice": Twoja wspierająca, głęboka puenta jako Narratora, osadzona w Twoim unikalnym tonie.
Zwróć WYŁĄCZNIE poprawny obiekt JSON.`;

  const synthesisMessages: LlmMessage[] = [
    { role: 'system', content: synthesisSystemPrompt },
    {
      role: 'user',
      content: `Dylemat użytkownika:\n"${dilemmaText}"\n\nWypowiedzi doradców przy Okrągłym stole:\n${advisorOutputsText}\n\nPrzygotuj syntezę w formacie JSON.`,
    },
  ];

  let narratorSynthesis: NarratorSynthesis;
  try {
    const rawSynthesis = await aiProviders.chat.generateText(synthesisMessages, {
      responseFormat: 'json',
      temperature: 0.4,
    });
    const cleanedSynthesis = cleanJsonString(rawSynthesis);
    const parsedSynthesis = JSON.parse(cleanedSynthesis);
    narratorSynthesis = {
      consensus: parsedSynthesis.consensus || 'Doradcy wskazują na konieczność szczerego spojrzenia na priorytety.',
      divergence:
        parsedSynthesis.divergence || 'Różnica dotyczy wyboru między natychmiastowym działaniem a odpoczynkiem.',
      keyQuestion: parsedSynthesis.keyQuestion || 'Co wybierzesz, jeśli nie będziesz bać się oceny?',
      narratorAdvice:
        parsedSynthesis.narratorAdvice || 'Zaufaj swojemu procesowi i podejmij decyzję w zgodzie ze sobą.',
    };
  } catch (err) {
    console.warn('Błąd generowania syntezy Narratora:', err);
    narratorSynthesis = {
      consensus: 'Wszyscy doradcy zachęcają do uważności i działania w zgodzie ze swoimi wartościami.',
      divergence: 'Rozbieżność dotyczy akcentu między dyscypliną a wyrozumiałością dla siebie.',
      keyQuestion: 'Co w tym dylemacie najbardziej zależy od Ciebie?',
      narratorAdvice: 'Daj sobie przestrzeń na oddech i wybierz krok, który daje Ci najwięcej spokoju.',
    };
  }

  return {
    problemCore: recommendations[0]?.angle || 'Sedno dylematu decyzyjnego.',
    recommendations,
    narratorSynthesis,
    crisisDetected: false,
  };
}
