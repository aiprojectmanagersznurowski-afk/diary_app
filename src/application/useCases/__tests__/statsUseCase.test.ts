import {
  getAnalyticsData,
  getDailyAnalyticsData,
  dayStringOffsetFromToday,
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

describe('getAnalyticsData (DiaryEntry)', () => {
  it('does not mutate the entry date object in place', () => {
    const entry = makeEntry();
    const originalTime = entry.date.getTime();

    getAnalyticsData([entry], 7);

    expect(entry.date.getTime()).toBe(originalTime);
  });

  it('computes goal alignment from goalImpactType', () => {
    const positiveEntry = makeEntry({
      parsedData: { ...makeEntry().parsedData!, goalImpactType: 'positive' },
    });

    const { goalAlignment } = getAnalyticsData([positiveEntry], 7);
    expect(goalAlignment).toBe(100);
  });

  it('averages goalImpactType across multiple entries within range', () => {
    const positive = makeEntry({ parsedData: { ...makeEntry().parsedData!, goalImpactType: 'positive' } });
    const negative = makeEntry({ parsedData: { ...makeEntry().parsedData!, goalImpactType: 'negative' } });

    const { goalAlignment } = getAnalyticsData([positive, negative], 7);
    expect(goalAlignment).toBe(50);
  });
});

describe('getDailyAnalyticsData (DailyDocument, used by InsightsScreen)', () => {
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

  it('generates goalHistory matching the days length with correct statuses', () => {
    const today = dayStringOffsetFromToday(0);
    const yesterday = dayStringOffsetFromToday(-1);
    const docs = [
      makeDailyDoc(today, { goalImpactType: 'positive' }),
      makeDailyDoc(yesterday, { goalImpactType: 'negative' }),
    ];

    const { goalHistory } = getDailyAnalyticsData(docs, 7);
    expect(goalHistory).toHaveLength(7);
    expect(goalHistory[6].status).toBe('positive');
    expect(goalHistory[6].score).toBe(100);
    expect(goalHistory[5].status).toBe('negative');
    expect(goalHistory[5].score).toBe(0);
    expect(goalHistory[0].status).toBe('empty');
    expect(goalHistory[0].score).toBe(0);
  });

  it('aggregates dominant emotions sorted by count with percentages', () => {
    const today = dayStringOffsetFromToday(0);
    const yesterday = dayStringOffsetFromToday(-1);
    const docs = [
      makeDailyDoc(today, { emotions: ['spokój', 'radość', 'motywacja'] }),
      makeDailyDoc(yesterday, { emotions: ['spokój', 'wdzięczność'] }),
    ];

    const { dominantEmotions } = getDailyAnalyticsData(docs, 7);
    expect(dominantEmotions.length).toBeGreaterThanOrEqual(4);
    expect(dominantEmotions[0].emotion).toBe('spokój');
    expect(dominantEmotions[0].count).toBe(2);
    expect(dominantEmotions[0].percentage).toBe(40); // 2 out of 5 total mentions
  });

  it('returns empty lists for days without documents', () => {
    const data = getDailyAnalyticsData([], 7);
    expect(data.goalAlignment).toBe(0);
    expect(data.goalHistory).toHaveLength(7);
    expect(data.goalHistory.every((d) => d.status === 'empty')).toBe(true);
    expect(data.dominantEmotions).toHaveLength(0);
  });
});

describe('getGoalAlignmentMessage', () => {
  it('getGoalAlignmentMessage selects the proper message based on threshold', () => {
    expect(getGoalAlignmentMessage(80)).toBe('Ostatnie dni świetnie przybliżyły Cię do celów.');
    expect(getGoalAlignmentMessage(55)).toBe('Dobra równowaga i stały postęp w realizacji celów.');
    expect(getGoalAlignmentMessage(20)).toBe('Warto przyjrzeć się priorytetom na najbliższe dni.');
  });
});
