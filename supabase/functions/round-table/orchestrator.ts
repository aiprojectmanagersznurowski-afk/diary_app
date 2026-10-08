import { AiProviders } from '../_shared/ai/factory.ts';
import { LlmMessage } from '../_shared/ai/types.ts';
import { loadPersonalityPrompt, normalizePersonalityKey } from '../_shared/prompts/personalityLoader.ts';
import { PersonaRecommendation, NarratorSynthesis, RoundTableResult, UserContextFileRow } from './types.ts';

const PERSONA_DISPLAY_NAMES: Record<string, string> = {
  friend: 'Po prostu przyjaciel',
  banach: 'Stefan Banach',
  buddha: 'Buddha',
  pilsudski: 'Józef Piłsudski',
  deida: 'David Deida (Obecność i Droga)',
  huberman: 'Andrew Huberman (Biologia i Rytm Dnia)',
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
Zasady Twojej perspektywy:
${personaPrompt}

Kontekst użytkownika (wartości, cele, nawyki i historia):
${contextStr}

Instrukcje:
1. Odpowiedz na dylemat użytkownika ze swojej unikalnej perspektywy.
2. Twoja odpowiedź musi być w formacie JSON i zawierać dokładnie 3 pola:
   - "angle": sedno dylematu i możliwe źródła z Twojej perspektywy (o co naprawdę tu chodzi?),
   - "recommendation": Twoja konkretna rekomendacja decyzyjna,
   - "nextStep": jeden najbliższy, realistyczny krok lub eksperyment.
Pamiętaj: jeśli opierasz się na publicznych ideach (Deida / Huberman), wypowiadaj się w 3. osobie i nie udzielaj porad medycznych/farmakologicznych.
Zwróć WYŁĄCZNIE poprawny obiekt JSON.`;

      const messages: LlmMessage[] = [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Oto mój dylemat:\n"${dilemmaText}"\n\nPrzeanalizuj go ze swojej perspektywy i zwróć odpowiedź w formacie JSON.`,
        },
      ];

      try {
        const rawRes = await aiProviders.chat.generateText(messages, {
          responseFormat: 'json',
          temperature: 0.6,
        });

        const parsed = JSON.parse(rawRes);
        return {
          personaId: memberKey,
          personaName,
          angle: parsed.angle || 'Analiza perspektywy doradcy.',
          recommendation: parsed.recommendation || 'Zalecenie doradcy.',
          nextStep: parsed.nextStep || 'Zastanów się nad priorytetami.',
        };
      } catch {
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
Twój styl i perspektywa:
${narratorPrompt}

Twoje zadanie:
Wysłuchałeś wypowiedzi doradców przy Okrągłym stole i przygotowujesz dla użytkownika zwięzłą, klarowną syntezę.
Zwróć obiekt JSON z polami:
- "consensus": w czym doradcy są zgodni lub co jest wspólnym mianownikiem ich rad,
- "divergence": gdzie pojawia się kluczowe napięcie lub różnica podejść,
- "keyQuestion": jedno najważniejsze, celne pytanie, które użytkownik powinien sobie zadać przed decyzją,
- "narratorAdvice": Twoja wspierająca myśl jako Narratora łącząca te wątki.
Zwróć WYŁĄCZNIE poprawny obiekt JSON.`;

  const synthesisMessages: LlmMessage[] = [
    { role: 'system', content: synthesisSystemPrompt },
    {
      role: 'user',
      content: `Dylemat użytkownika:\n"${dilemmaText}"\n\nWypowiedzi doradców przy stole:\n${advisorOutputsText}\n\nPrzygotuj syntezę w formacie JSON.`,
    },
  ];

  let narratorSynthesis: NarratorSynthesis;
  try {
    const rawSynthesis = await aiProviders.chat.generateText(synthesisMessages, {
      responseFormat: 'json',
      temperature: 0.4,
    });
    const parsedSynthesis = JSON.parse(rawSynthesis);
    narratorSynthesis = {
      consensus: parsedSynthesis.consensus || 'Doradcy wskazują na konieczność szczerego spojrzenia na priorytety.',
      divergence:
        parsedSynthesis.divergence || 'Różnica dotyczy wyboru między natychmiastowym działaniem a odpoczynkiem.',
      keyQuestion: parsedSynthesis.keyQuestion || 'Co wybierzesz, jeśli nie będziesz bać się oceny?',
      narratorAdvice:
        parsedSynthesis.narratorAdvice || 'Zaufaj swojemu procesowi i podejmij decyzję w zgodzie ze sobą.',
    };
  } catch {
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
