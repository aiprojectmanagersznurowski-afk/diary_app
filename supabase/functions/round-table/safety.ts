import { HelplineInfo } from './types.ts';

export const POLISH_HELPLINES: HelplineInfo[] = [
  {
    name: 'Kryzys Emocjonalny (Telefon Zaufania dla Dorosłych)',
    phone: '116 123',
    description: 'Bezpłatne całodobowe wsparcie psychologiczne dla osób w kryzysie.',
  },
  {
    name: 'Antydepresyjny Telefon Zaufania (Fundacja ITAKA)',
    phone: '22 484 88 01',
    description: 'Wsparcie psychologiczne w stanach depresyjnych i trudnych momentach życiowych.',
  },
  {
    name: 'Centrum Wsparcia dla Osób Dorosłych w Kryzysie',
    phone: '800 70 2222',
    description: 'Bezpłatna, całodobowa pomoc psychologiczna i psychiatryczna.',
  },
  {
    name: 'Numer Alarmowy',
    phone: '112',
    description: 'W sytuacji bezpośredniego zagrożenia życia lub zdrowia.',
  },
];

const CRISIS_PATTERNS = [
  /chc[eę]\s+(si[eę]\s+)?zabi[cć]/i,
  /nie\s+chc[eę]\s+ju[zż]\s+[zż]y[cć]/i,
  /odebra[cć]\s+sobie\s+[zż]ycie/i,
  /samob[oó]jstw/i,
  /samookalecz/i,
  /ci[aą][cć]\s+si[eę]/i,
  /sko[nń]czy[cć]\s+ze\s+sob[aą]/i,
  /lepiej\s+by[lł]oby(\s+dla\s+wszystkich)?\s+gdybym\s+nie\s+[zż]y[lł]/i,
  /przemoc\s+domow/i,
  /bije\s+mnie/i,
  /zn[eę]ca\s+si[eę]/i,
];

export interface SafetyCheckResult {
  isCrisis: boolean;
  message?: string;
  helplines?: HelplineInfo[];
}

export function checkCrisis(text: string): SafetyCheckResult {
  if (!text || typeof text !== 'string') {
    return { isCrisis: false };
  }

  const matches = CRISIS_PATTERNS.some((pattern) => pattern.test(text));
  if (matches) {
    return {
      isCrisis: true,
      message:
        'Twój wpis wskazuje na bardzo trudny, bolesny moment lub kryzys emocjonalny. W takiej sytuacji doradztwo AI i Okrągły stół nie zastąpią profesjonalnej, żywej pomocy. Bardzo zależy nam na Twoim bezpieczeństwie i zdrowiu. Prosimy, skorzystaj ze wsparcia wykwalifikowanych specjalistów – nie jesteś sam.',
      helplines: POLISH_HELPLINES,
    };
  }

  return { isCrisis: false };
}
