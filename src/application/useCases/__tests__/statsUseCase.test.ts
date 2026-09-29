import { getAnalyticsData, getDailyAnalyticsData, dayStringOffsetFromToday } from '../statsUseCase';
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
});
