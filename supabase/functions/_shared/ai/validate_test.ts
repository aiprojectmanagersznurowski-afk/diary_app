import { validateAndRepairJson, LlmValidationError, cleanJsonString } from './validate.ts';
import { structureSchema } from '../schemas/structure.ts';
import { linkSchema } from '../schemas/link.ts';
import { digestSchema } from '../schemas/digest.ts';
import { onboardingGoalsSchema } from '../schemas/onboarding-goals.ts';

Deno.test('cleanJsonString - poprawnie usuwa znaczniki markdown i otaczający tekst', () => {
  const withMarkdownFences = '```json\n{"key": "value"}\n```';
  if (cleanJsonString(withMarkdownFences) !== '{"key": "value"}') {
    throw new Error('Niepoprawne oczyszczenie znaczników markdown ```json');
  }

  const withSurroundingProse = 'Oto wygenerowany JSON:\n```\n{"result": 123}\n```\nMam nadzieję, że to pomoże!';
  if (cleanJsonString(withSurroundingProse) !== '{"result": 123}') {
    throw new Error('Niepoprawne wyodrębnienie obiektu JSON z prozy');
  }
});

// --- 1. Schemat: structure ---

Deno.test('structureSchema - poprawny JSON przechodzi walidację za pierwszym razem', async () => {
  const validJson = JSON.stringify({
    notes: [
      {
        title: 'Nowy pomysł na aplikację',
        noteType: 'idea',
        category: 'Praca',
        tags: ['projekt-x', 'innowacja'],
        content: 'Wpadłem na pomysł stworzenia nowej aplikacji do zarządzania myślami.',
      },
    ],
  });

  const result = await validateAndRepairJson(validJson, structureSchema);
  if (result.notes.length !== 1 || result.notes[0].noteType !== 'idea') {
    throw new Error('Nieprawidłowy wynik walidacji dla structure');
  }
});

Deno.test('structureSchema - JSON z błędem zostaje pomyślnie naprawiony przez repairCallback', async () => {
  // Brak wymaganego pola noteType
  const invalidJson = JSON.stringify({
    notes: [
      {
        title: 'Brakujący typ',
        category: 'Praca',
        content: 'Testowa treść',
      },
    ],
  });

  let repairCalled = false;
  const repairCallback = async (errMsg: string, raw: string) => {
    repairCalled = true;
    if (!errMsg.includes('noteType')) {
      throw new Error(`Oczekiwano wzmianki o noteType w błędzie: ${errMsg}`);
    }
    const parsed = JSON.parse(raw);
    parsed.notes[0].noteType = 'reflection';
    return parsed;
  };

  const result = await validateAndRepairJson(invalidJson, structureSchema, repairCallback);
  if (!repairCalled || result.notes[0].noteType !== 'reflection') {
    throw new Error('Oczekiwano pomyślnej naprawy i zwrócenia poprawnego typu');
  }
});

Deno.test('structureSchema - JSON nie do naprawy rzuca LlmValidationError', async () => {
  const invalidJson = 'to nie jest json i nie da sie naprawic';

  let caughtError: LlmValidationError | null = null;
  const failingRepair = async () => 'nadal nie json';

  try {
    await validateAndRepairJson(invalidJson, structureSchema, failingRepair);
  } catch (err) {
    if (err instanceof LlmValidationError) {
      caughtError = err;
    }
  }

  if (!caughtError || !caughtError.repairAttempted) {
    throw new Error('Oczekiwano LlmValidationError z repairAttempted = true');
  }
});

// --- 2. Schemat: link ---

Deno.test('linkSchema - poprawny JSON powiązań przechodzi walidację', async () => {
  const validJson = JSON.stringify({
    links: [
      {
        targetId: '123e4567-e89b-12d3-a456-426614174000',
        score: 0.85,
        reason: 'Obie notatki dotyczą architektury chmurowej w projekcie Vocaly.',
      },
    ],
  });

  const result = await validateAndRepairJson(validJson, linkSchema);
  if (result.links.length !== 1 || result.links[0].score !== 0.85) {
    throw new Error('Niepoprawne dane w linkSchema');
  }
});

Deno.test('linkSchema - score poza zakresem [0, 1] zostaje naprawiony przez repairCallback', async () => {
  const invalidJson = JSON.stringify({
    links: [
      {
        targetId: '123e4567-e89b-12d3-a456-426614174000',
        score: 1.5, // niedozwolone > 1
        reason: 'Ważne powiązanie',
      },
    ],
  });

  const repairCallback = async (_err: string, raw: string) => {
    const parsed = JSON.parse(raw);
    parsed.links[0].score = 0.95;
    return parsed;
  };

  const result = await validateAndRepairJson(invalidJson, linkSchema, repairCallback);
  if (result.links[0].score !== 0.95) {
    throw new Error('Oczekiwano naprawionego score = 0.95');
  }
});

Deno.test('linkSchema - JSON nie do naprawy rzuca LlmValidationError', async () => {
  const invalidJson = JSON.stringify({ links: 'powinno byc array, a jest string' });

  let errorCaught = false;
  try {
    await validateAndRepairJson(invalidJson, linkSchema, async () => ({ links: 123 }));
  } catch (err) {
    if (err instanceof LlmValidationError) {
      errorCaught = true;
    }
  }

  if (!errorCaught) {
    throw new Error('Oczekiwano LlmValidationError');
  }
});

// --- 3. Schemat: digest ---

Deno.test('digestSchema - poprawny JSON wpisu dnia zgodny z ParsedDiaryData i ideas przechodzi walidację', async () => {
  const validJson = JSON.stringify({
    dominantThought: 'Dzisiejszy dzień upłynął pod znakiem spokoju i produktywnej pracy.',
    summary: 'Zrobiłem dzisiaj znaczne postępy w architekturze backendu. Czułem motywację i spokój.',
    quotes: ['Najlepszy kod to kod, którego nie trzeba pisać.'],
    impactOnGoals: 'Przybliżyłem się do celu budowy niezawodnego systemu.',
    goalImpactType: 'positive',
    completedTasks: ['Zaprojektowanie schematów zod', 'Wdrożenie mechanizmu naprawy'],
    importantEvents: ['Spotkanie z zespołem rano'],
    emotions: ['Spokój', 'Satysfakcja', 'Ulga'],
    emotionTriggers: [{ emotion: 'Satysfakcja', trigger: 'Działające testy automatyczne' }],
    fatigueLevel: 4,
    stressVsCalm: 'calm',
    gratefulFor: 'Dobre zdrowie i jasny umysł.',
    triggeredStress: null,
    triggeredAnger: null,
    triggeredJoy: ['Pyszna kawa poranna'],
    triggeredCalm: ['Wieczorny spacer'],
    goalAdvice: 'Pamiętaj o odpoczynku i regularnym śnie.',
    ideas: [
      {
        documentId: 'doc-uuid-1',
        title: 'Asynchroniczna kolejka myśli',
        oneLiner: 'Kolejka lokalna odporna na zaniki internetu w podróży.',
      },
    ],
  });

  const result = await validateAndRepairJson(validJson, digestSchema);
  if (result.goalImpactType !== 'positive' || result.ideas.length !== 1) {
    throw new Error('Niepoprawne dane w digestSchema');
  }
  if (result.ideas[0].title !== 'Asynchroniczna kolejka myśli') {
    throw new Error('Błędne pole ideas w digestSchema');
  }
});

Deno.test('digestSchema - niepoprawny fatigueLevel (np. 15) zostaje naprawiony przez repairCallback', async () => {
  const invalidJson = JSON.stringify({
    dominantThought: 'Myśl',
    summary: 'Podsumowanie',
    quotes: [],
    impactOnGoals: 'Wpływ',
    goalImpactType: 'neutral',
    completedTasks: [],
    importantEvents: [],
    emotions: [],
    fatigueLevel: 15, // > 10 niedozwolone
    stressVsCalm: 'neutral',
    gratefulFor: 'Wszystko',
    ideas: [],
  });

  const repairCallback = async (_err: string, raw: string) => {
    const parsed = JSON.parse(raw);
    parsed.fatigueLevel = 8;
    return parsed;
  };

  const result = await validateAndRepairJson(invalidJson, digestSchema, repairCallback);
  if (result.fatigueLevel !== 8) {
    throw new Error(`Oczekiwano fatigueLevel = 8, otrzymano ${result.fatigueLevel}`);
  }
});

Deno.test('digestSchema - JSON nie do naprawy rzuca LlmValidationError', async () => {
  const invalidJson = JSON.stringify({ dominantThought: '' }); // puste pole

  let errorCaught = false;
  try {
    await validateAndRepairJson(invalidJson, digestSchema);
  } catch (err) {
    if (err instanceof LlmValidationError) {
      errorCaught = true;
    }
  }

  if (!errorCaught) {
    throw new Error('Oczekiwano LlmValidationError dla digestSchema');
  }
});

// --- 4. Schemat: onboarding-goals ---

Deno.test('onboardingGoalsSchema - poprawny JSON z listą celów przechodzi walidację', async () => {
  const validJson = JSON.stringify({
    goals: [
      'Rozwój kariery architekta systemów',
      'Regularny trening siłowy 3 razy w tygodniu',
      'Nauka języka hiszpańskiego',
    ],
  });

  const result = await validateAndRepairJson(validJson, onboardingGoalsSchema);
  if (result.goals.length !== 3) {
    throw new Error(`Oczekiwano 3 celów, otrzymano ${result.goals.length}`);
  }
});

Deno.test('onboardingGoalsSchema - pusta tablica celów zostaje naprawiona przez repairCallback', async () => {
  const invalidJson = JSON.stringify({ goals: [] }); // min(1) wymaga co najmniej 1 celu

  const repairCallback = async () => {
    return {
      goals: ['Konsekwentny rozwój osobisty'],
    };
  };

  const result = await validateAndRepairJson(invalidJson, onboardingGoalsSchema, repairCallback);
  if (result.goals.length !== 1 || result.goals[0] !== 'Konsekwentny rozwój osobisty') {
    throw new Error('Oczekiwano naprawionego celu w onboardingGoalsSchema');
  }
});

Deno.test('onboardingGoalsSchema - JSON nie do naprawy rzuca LlmValidationError', async () => {
  const invalidJson = '{"goals": []}';

  let errorCaught = false;
  try {
    await validateAndRepairJson(invalidJson, onboardingGoalsSchema, async () => ({ goals: [] }));
  } catch (err) {
    if (err instanceof LlmValidationError) {
      errorCaught = true;
    }
  }

  if (!errorCaught) {
    throw new Error('Oczekiwano LlmValidationError');
  }
});

// --- 5. Odporność na formaty LLM (tablica top-level, aliasy, kategoria Dylematy) ---

Deno.test('structureSchema - top-level array jest automatycznie opakowywana w { notes: [...] }', async () => {
  const topLevelArray = JSON.stringify([
    {
      title: 'Decyzja o zmianie kierunku',
      noteType: 'dylemat',
      category: 'Dylematy',
      tags: 'kariera, priorytety',
      content: 'Zastanawiam się czy kontynuować obecny projekt czy zmienić kierunek.',
    },
  ]);

  const result = await validateAndRepairJson(topLevelArray, structureSchema);
  if (result.notes.length !== 1) {
    throw new Error(`Oczekiwano 1 notatki, otrzymano ${result.notes.length}`);
  }
  const note = result.notes[0];
  if (note.noteType !== 'reflection') {
    throw new Error(`Oczekiwano zmapowania dylemat na reflection, otrzymano: ${note.noteType}`);
  }
  if (note.category !== 'Dylematy') {
    throw new Error(`Oczekiwano kategorii Dylematy, otrzymano: ${note.category}`);
  }
  if (note.tags.length !== 2 || note.tags[0] !== 'kariera' || note.tags[1] !== 'priorytety') {
    throw new Error(`Oczekiwano sparsowanych tagów [kariera, priorytety], otrzymano: ${JSON.stringify(note.tags)}`);
  }
});

Deno.test('structureSchema - polskie aliasy typów notatek i brakująca kategoria', async () => {
  const rawJson = JSON.stringify({
    notes: [
      {
        title: 'Kupić bilet',
        noteType: 'Zadanie',
        content: 'Muszę kupić bilet na pociąg.',
      },
      {
        title: 'Świetny pomysł na feature',
        noteType: 'pomysł',
        tags: null,
        content: 'Wymyśliłem nową funkcję.',
      },
    ],
  });

  const result = await validateAndRepairJson(rawJson, structureSchema);
  if (result.notes[0].noteType !== 'task' || result.notes[0].category !== 'Osobiste') {
    throw new Error(`Niepoprawna normalizacja dla zadania: ${JSON.stringify(result.notes[0])}`);
  }
  if (result.notes[1].noteType !== 'idea' || !Array.isArray(result.notes[1].tags)) {
    throw new Error(`Niepoprawna normalizacja dla pomysłu: ${JSON.stringify(result.notes[1])}`);
  }
});

Deno.test('linkSchema - top-level array powiązań jest automatycznie opakowywana w { links: [...] }', async () => {
  const rawArray = JSON.stringify([
    {
      targetId: 'doc-uuid-1',
      score: 0.9,
      reason: 'Wspólny kontekst celów kwartalnych',
    },
  ]);

  const result = await validateAndRepairJson(rawArray, linkSchema);
  if (result.links.length !== 1 || result.links[0].targetId !== 'doc-uuid-1') {
    throw new Error(`Niepoprawna normalizacja top-level array w linkSchema: ${JSON.stringify(result)}`);
  }
});
