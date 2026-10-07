import {
  getAnalyticsData,
  getDailyAnalyticsData,
  getDailyCalmPercentage,
  dayStringOffsetFromToday,
  getEnergyNote,
  getGoalAlignmentMessage,
} from '../statsUseCase';
import { DiaryEntry } from '../../../domain/models/DiaryEntry';
import { DailyDocument } from '../../../domain/models/DailyDocument';

function makeEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  const date = new Date();
  date.setHours(15, 0, 0, 0);
  return {
    id: 'entry-1',
    date,
    fullText: '',
    createdAt: date,
    parsedData: {
      dominantThought: '',
      summary: '',
      quotes: [],
      impactOnGoals: '',
      goalImpactType: 'positive',
      completedTasks: [],
      importantEvents: [],
      emotions: [],
      fatigueLevel: 5,
      stressVsCalm: 'neutral',
      gratefulFor: '',
      triggeredStress: null,
      triggeredAnger: null,
      triggeredJoy: null,
      triggeredCalm: null,
      goalAdvice: null,
    },
    ...overrides,
  };
}

function makeDailyDoc(day: string, overrides: Partial<DailyDocument> = {}): DailyDocument {
  return {
    id: `doc-${day}`,
    userId: 'user-1',
    kind: 'daily',
    day,
    bodyMd: '',
    mdPath: '',
    tags: [],
    dominantThought: '',
    summary: '',
    quotes: [],
    impactOnGoals: '',
    goalImpactType: 'positive',
    completedTasks: [],
    importantEvents: [],
    emotions: [],
    emotionTriggers: [],
    fatigueLevel: 5,
    stressVsCalm: 'neutral',
    gratefulFor: '',
    goalAdvice: null,
    ideas: [],
    createdAt: `${day}T12:00:00Z`,
    ...overrides,
  };
}

describe('getAnalyticsData (DiaryEntry, legacy model used by HomeScreen)', () => {
  it('does not mutate the entry date object in place (known bug from roadmap)', () => {
    const entry = makeEntry();
    const originalTime = entry.date.getTime();

    getAnalyticsData([entry], 7);

    expect(entry.date.getTime()).toBe(originalTime);
  });

  it('computes goal alignment from goalImpactType, not from an emotions/tasks heuristic', () => {
    const positiveEntry = makeEntry({
      parsedData: { ...makeEntry().parsedData!, goalImpactType: 'positive', emotions: [], completedTasks: [] },
    });

    const { goalAlignment } = getAnalyticsData([positiveEntry], 7);

    // A heuristic based on emotions/completedTasks would score this well below 100 (base 50, no bonuses).
    expect(goalAlignment).toBe(100);
  });

  it('averages goalImpactType across multiple entries within range', () => {
    const positive = makeEntry({ parsedData: { ...makeEntry().parsedData!, goalImpactType: 'positive' } });
    const negative = makeEntry({ parsedData: { ...makeEntry().parsedData!, goalImpactType: 'negative' } });

    const { goalAlignment } = getAnalyticsData([positive, negative], 7);

    expect(goalAlignment).toBe(50);
  });
});

describe('getDailyAnalyticsData (DailyDocument, server-computed model used by InsightsScreen)', () => {
  it('places a daily document on its matching day index and derives stress/calm/energy from it', () => {
    const today = dayStringOffsetFromToday(0);
    const doc = makeDailyDoc(today, { stressVsCalm: 'calm', fatigueLevel: 2 });

    const { stress, calm, energy } = getDailyAnalyticsData([doc], 7);

    expect(calm[6].value).toBe(50);
    expect(stress[6].value).toBe(0);
    expect(energy[6].value).toBe(80); // 100 - fatigue(2)*10
  });

  it('leaves days without a document at zero without throwing', () => {
    const { stress, calm } = getDailyAnalyticsData([], 7);

    expect(stress).toHaveLength(7);
    expect(calm.every((p) => p.value === 0)).toBe(true);
  });

  it('computes goal alignment purely from goalImpactType across the provided documents', () => {
    const today = dayStringOffsetFromToday(0);
    const yesterday = dayStringOffsetFromToday(-1);
    const docs = [
      makeDailyDoc(today, { goalImpactType: 'positive' }),
      makeDailyDoc(yesterday, { goalImpactType: 'neutral' }),
    ];

    const { goalAlignment } = getDailyAnalyticsData(docs, 7);

    expect(goalAlignment).toBe(75); // (100 + 50) / 2
  });

  it('oblicza średnie wartości stresu, spokoju i energii z istniejących dokumentów', () => {
    const today = dayStringOffsetFromToday(0);
    const yesterday = dayStringOffsetFromToday(-1);
    const docs = [
      makeDailyDoc(today, { stressVsCalm: 'stress', fatigueLevel: 2 }), // stress 50, energy 80
      makeDailyDoc(yesterday, { stressVsCalm: 'calm', fatigueLevel: 6 }), // calm 50, energy 40
    ];

    const data = getDailyAnalyticsData(docs, 7);
    expect(data.avgStress).toBe(25); // (50 + 0) / 2
    expect(data.avgCalm).toBe(25); // (0 + 50) / 2
    expect(data.avgEnergy).toBe(60); // (80 + 40) / 2
  });

  it('zwraca 0 dla średnich przy braku dokumentów', () => {
    const data = getDailyAnalyticsData([], 7);
    expect(data.avgStress).toBe(0);
    expect(data.avgCalm).toBe(0);
    expect(data.avgEnergy).toBe(0);
  });
});

describe('getEnergyNote & getGoalAlignmentMessage', () => {
  it('getEnergyNote zwraca dzień o najwyższej energii lub Stabilna', () => {
    const energy = [
      { value: 40, label: 'Pon' },
      { value: 90, label: 'Wto' },
      { value: 60, label: 'Śro' },
    ];
    expect(getEnergyNote(energy)).toBe('Najwyższa w Wto');
    expect(getEnergyNote([])).toBe('Stabilna');
  });

  it('getGoalAlignmentMessage dobiera właściwy komunikat w zależności od progu', () => {
    expect(getGoalAlignmentMessage(80)).toBe('Ostatnie dni świetnie przybliżyły Cię do celów.');
    expect(getGoalAlignmentMessage(55)).toBe('Dobra równowaga i stały postęp w realizacji celów.');
    expect(getGoalAlignmentMessage(20)).toBe('Warto przyjrzeć się priorytetom na najbliższe dni.');
  });
});

describe('getDailyCalmPercentage (DailyDocument, HomeScreen)', () => {
  it('zwraca 0 bez wpisów dnia', () => {
    expect(getDailyCalmPercentage([])).toBe(0);
  });

  it('liczy odsetek spokojnych dni tylko z ostatnich 7 dni', () => {
    const docs = [
      makeDailyDoc(dayStringOffsetFromToday(0), { stressVsCalm: 'calm' }),
      makeDailyDoc(dayStringOffsetFromToday(-1), { stressVsCalm: 'stress' }),
      makeDailyDoc(dayStringOffsetFromToday(-2), { stressVsCalm: 'calm' }),
      makeDailyDoc(dayStringOffsetFromToday(-3), { stressVsCalm: 'neutral' }),
      makeDailyDoc(dayStringOffsetFromToday(-30), { stressVsCalm: 'stress' }),
    ];
    expect(getDailyCalmPercentage(docs)).toBe(50);
  });
});
