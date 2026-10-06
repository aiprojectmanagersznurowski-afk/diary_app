/**
 * Teksty interfejsu (PL), dokładnie jak w prototypie z docs/08-design-ui.md. Kolejne zadania
 * Fazy 8 dopisują własne sekcje; ekrany nie powinny mieć tekstów na sztywno.
 */
export const pl = {
  common: {
    back: 'Wstecz',
    cancel: 'Anuluj',
    done: 'Gotowe',
    retry: 'Spróbuj ponownie',
  },
  login: {
    title: 'Vocaly',
    subtitle: 'Twój pamiętnik głosowy',
    google: 'Zaloguj z Google',
    appleError: 'Błąd podczas logowania przez Apple.',
    googleError: 'Błąd podczas logowania przez Google.',
    appleNoToken: 'Nie otrzymano tokenu tożsamości z usługi Apple.',
    googleNoToken: 'Brak tokenu ID Google. Upewnij się, że Client ID jest poprawnie skonfigurowany.',
  },
  onboarding: {
    hello: 'Witaj w',
    appName: 'Twoim Pamiętniku',
    subtitle: (goalsCount: number) => `Zdefiniuj swoje ${goalsCount} główne cele.`,
    stepLabel: (step: number, total: number) => `KROK ${step} Z ${total}`,
    questions: ['Jaki jest Twój najważniejszy cel osobisty lub zdrowotny?', 'Jaki jest Twój główny cel zawodowy?'],
    tapToRecord: 'Dotknij, aby nagrać odpowiedź',
    tapToStop: 'Dotknij, aby zakończyć',
    processing: 'Przetwarzam...',
    analyzing: 'Analizuję Twoje cele...',
    skip: 'Pomiń',
    goalsSet: 'Twoje cele ustawione!',
    goalsSetSubtitle: 'AI przygotowało plan i będzie Cię wspierać każdego dnia.',
    start: 'Zaczynamy',
    defaultGoal: 'Chcę prowadzić pamiętnik i dbać o swój nastrój',
    errorNoAudio: 'Nie nagrano dźwięku.',
    errorNoSpeech: 'Nie udało się rozpoznać mowy. Spróbuj nagrać odpowiedź jeszcze raz.',
    errorNoGoals: 'Nie udało się wyodrębnić żadnych celów z Twojej wypowiedzi.',
  },
} as const;

export type Strings = typeof pl;
