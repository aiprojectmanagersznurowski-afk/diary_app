import { renderDailyMarkdown } from './dailyTemplate.ts';
import { DigestOutput } from '../schemas/digest.ts';

function baseDigest(overrides: Partial<DigestOutput> = {}): DigestOutput {
  return {
    dominantThought: 'Dziś udało mi się dokończyć ważny projekt.',
    summary: 'Był to produktywny dzień pełen dobrych decyzji.',
    quotes: [],
    impactOnGoals: 'Zbliżyłem się do celu zawodowego.',
    goalImpactType: 'positive',
    completedTasks: [],
    importantEvents: [],
    emotions: [],
    emotionTriggers: [],
    fatigueLevel: 3,
    stressVsCalm: 'calm',
    gratefulFor: 'Za spokojny wieczór.',
    triggeredStress: null,
    triggeredAnger: null,
    triggeredJoy: null,
    triggeredCalm: null,
    goalAdvice: null,
    ideas: [],
    ...overrides,
  };
}

Deno.test('renderDailyMarkdown - zawiera nagłówek YAML z tagami i datą', () => {
  const md = renderDailyMarkdown({
    day: '2026-09-23',
    personality: 'friend',
    digest: baseDigest(),
    tags: ['projekt-x', 'ux'],
    noteSlugs: [],
    recordingTimes: [],
  });

  if (!md.startsWith('---\ntype: daily\ndate: 2026-09-23\n')) {
    throw new Error(`Nieprawidłowy początek frontmatter: ${md.slice(0, 80)}`);
  }
  if (!md.includes('tags: [projekt-x, ux]')) {
    throw new Error('Brak realnych tagów w frontmatter (nie powinno być "tags: []")');
  }
  if (!md.includes('personality: friend')) {
    throw new Error('Brak pola personality w frontmatter');
  }
});

Deno.test('renderDailyMarkdown - polski nagłówek daty jest poprawnie sformatowany', () => {
  const md = renderDailyMarkdown({
    day: '2026-09-23', // środa
    personality: '',
    digest: baseDigest(),
    tags: [],
    noteSlugs: [],
    recordingTimes: [],
  });

  if (!md.includes('# Środa, 23 września 2026')) {
    throw new Error(`Brak poprawnego nagłówka daty: ${md}`);
  }
});

Deno.test('renderDailyMarkdown - sekcja pomysłów linkuje tylko do przekazanych notatek (ADR-005)', () => {
  const md = renderDailyMarkdown({
    day: '2026-09-23',
    personality: '',
    digest: baseDigest({
      ideas: [
        { documentId: 'doc-1', title: 'Pomysł A', oneLiner: 'Świetny pomysł na appkę.' },
        { documentId: 'doc-nieistniejacy', title: 'Wymyślony pomysł', oneLiner: 'Nie powinien się pojawić.' },
      ],
    }),
    tags: [],
    noteSlugs: [{ id: 'doc-1', slug: '2026-09-23-pomysl-a', title: 'Pomysł A', time: '09:00' }],
    recordingTimes: [],
  });

  if (!md.includes('[[2026-09-23-pomysl-a|Pomysł A]]')) {
    throw new Error('Brak odnośnika do istniejącej notatki typu idea');
  }
  if (md.includes('Wymyślony pomysł')) {
    throw new Error('Pomysł bez odpowiadającej notatki nie powinien pojawić się w renderowanym pliku');
  }
});

Deno.test('renderDailyMarkdown - sekcja Nagrania dnia pojawia się tylko gdy są nagrania', () => {
  const withoutRecordings = renderDailyMarkdown({
    day: '2026-09-23',
    personality: '',
    digest: baseDigest(),
    tags: [],
    noteSlugs: [],
    recordingTimes: [],
  });
  if (withoutRecordings.includes('## Nagrania dnia')) {
    throw new Error('Sekcja Nagrania dnia nie powinna pojawić się bez nagrań');
  }

  const withRecordings = renderDailyMarkdown({
    day: '2026-09-23',
    personality: '',
    digest: baseDigest(),
    tags: [],
    noteSlugs: [],
    recordingTimes: ['09:00', '18:30'],
  });
  if (!withRecordings.includes('## Nagrania dnia\n- 09:00 · 18:30')) {
    throw new Error(`Sekcja Nagrania dnia niepoprawnie wyrenderowana: ${withRecordings}`);
  }
});

Deno.test('renderDailyMarkdown - pole goalAdvice pojawia się tylko gdy jest ustawione', () => {
  const withoutAdvice = renderDailyMarkdown({
    day: '2026-09-23',
    personality: '',
    digest: baseDigest({ goalAdvice: null }),
    tags: [],
    noteSlugs: [],
    recordingTimes: [],
  });
  if (withoutAdvice.includes('## Rada')) {
    throw new Error('Sekcja Rada nie powinna pojawić się bez goalAdvice');
  }

  const withAdvice = renderDailyMarkdown({
    day: '2026-09-23',
    personality: '',
    digest: baseDigest({ goalAdvice: 'Zwróć uwagę na odpoczynek.' }),
    tags: [],
    noteSlugs: [],
    recordingTimes: [],
  });
  if (!withAdvice.includes('## Rada\nZwróć uwagę na odpoczynek.')) {
    throw new Error('Sekcja Rada niepoprawnie wyrenderowana');
  }
});
