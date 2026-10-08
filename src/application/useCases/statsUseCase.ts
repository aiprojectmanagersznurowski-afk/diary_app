import { DiaryEntry } from '../../domain/models/DiaryEntry';
import { DailyDocument } from '../../domain/models/DailyDocument';

export const APPLE_PASTEL_PALETTE = [
  '#FF9AA2',
  '#FFB7B2',
  '#FFDAC1',
  '#E2F0CB',
  '#B5EAD7',
  '#C7CEEA',
  '#A1C9F1',
  '#F4A261',
  '#2A9D8F',
  '#E76F51',
  '#48CAE4',
  '#90E0EF',
];

export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % APPLE_PASTEL_PALETTE.length;
  return APPLE_PASTEL_PALETTE[index];
}

export type GoalDayStatus = 'positive' | 'neutral' | 'negative' | 'empty';

export interface GoalDayPoint {
  day: string; // YYYY-MM-DD
  label: string; // 'Pon', 'Wto', etc. for 7d; '08' for 30d
  score: number; // 100, 50, 0
  status: GoalDayStatus;
}

export interface EmotionCountPoint {
  emotion: string;
  count: number;
  percentage: number;
  color: string;
}

export interface AnalyticsData {
  goalAlignment: number;
  goalHistory: GoalDayPoint[];
  dominantEmotions: EmotionCountPoint[];
}

export const DAYS_PL = ['Nie', 'Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob'];

export const GOAL_IMPACT_SCORE: Record<DailyDocument['goalImpactType'], number> = {
  positive: 100,
  neutral: 50,
  negative: 0,
};

/** Zwraca dzień (YYYY-MM-DD) przesunięty o `deltaDays` względem dzisiaj, bez mutacji obiektów Date. */
export function dayStringOffsetFromToday(deltaDays: number): string {
  const now = new Date();
  const shifted = new Date(now.getFullYear(), now.getMonth(), now.getDate() + deltaDays);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Komunikat obok pierścienia zgodności z celami w zależności od procentu. */
export function getGoalAlignmentMessage(percentage: number): string {
  if (percentage >= 70) {
    return 'Ostatnie dni świetnie przybliżyły Cię do celów.';
  }
  if (percentage >= 40) {
    return 'Dobra równowaga i stały postęp w realizacji celów.';
  }
  return 'Warto przyjrzeć się priorytetom na najbliższe dni.';
}

/**
 * Wylicza dane analityczne z wpisów dnia (kind='daily') policzonych po stronie serwera przez
 * build-daily (docs/02-architektura.md §6.3).
 * Wylicza zgodność z celami, historię dni oraz dominujące emocje z doc.emotions.
 */
export function getDailyAnalyticsData(dailyDocs: DailyDocument[], days: 7 | 30): AnalyticsData {
  const byDay = new Map(dailyDocs.map((doc) => [doc.day, doc]));

  const goalHistory: GoalDayPoint[] = [];
  let goalAlignmentSum = 0;
  let goalAlignmentCount = 0;

  for (let i = 0; i < days; i++) {
    const day = dayStringOffsetFromToday(i - (days - 1));
    const [y, m, d] = day.split('-').map(Number);
    const dayStr = day.slice(8, 10);
    const weekday = new Date(y, m - 1, d).getDay();
    const label = days === 7 ? DAYS_PL[weekday] : i % 5 === 0 ? dayStr : '';

    const doc = byDay.get(day);
    if (!doc) {
      goalHistory.push({
        day,
        label,
        score: 0,
        status: 'empty',
      });
      continue;
    }

    const status = doc.goalImpactType || 'neutral';
    const score = GOAL_IMPACT_SCORE[status] ?? 50;

    goalHistory.push({
      day,
      label,
      score,
      status,
    });

    goalAlignmentSum += score;
    goalAlignmentCount++;
  }

  const goalAlignment = goalAlignmentCount > 0 ? Math.round(goalAlignmentSum / goalAlignmentCount) : 0;

  // Dominujące emocje w wybranym okresie
  const emotionCounts: Record<string, number> = {};
  let totalEmotionsCount = 0;

  const minDay = dayStringOffsetFromToday(-(days - 1));
  dailyDocs.forEach((doc) => {
    if (doc.day >= minDay && Array.isArray(doc.emotions)) {
      doc.emotions.forEach((emo) => {
        const normalized = emo.trim().toLowerCase();
        if (normalized.length > 0) {
          emotionCounts[normalized] = (emotionCounts[normalized] || 0) + 1;
          totalEmotionsCount++;
        }
      });
    }
  });

  const dominantEmotions: EmotionCountPoint[] = Object.entries(emotionCounts)
    .map(([emotion, count]) => ({
      emotion,
      count,
      percentage: totalEmotionsCount > 0 ? Math.round((count / totalEmotionsCount) * 100) : 0,
      color: stringToColor(emotion),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return { goalAlignment, goalHistory, dominantEmotions };
}

/**
 * Wersja historyczna, oparta na DiaryEntry.
 */
export function getAnalyticsData(entries: DiaryEntry[], days: 7 | 30): AnalyticsData {
  const now = new Date();
  const startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  const goalHistory: GoalDayPoint[] = [];
  let goalAlignmentSum = 0;
  let goalAlignmentCount = 0;

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dayName = DAYS_PL[currentDate.getDay()];
    const dateNum = currentDate.getDate().toString().padStart(2, '0');
    const label = days === 7 ? dayName : i % 5 === 0 ? dateNum : '';
    const day = currentDate.toISOString().slice(0, 10);

    goalHistory.push({
      day,
      label,
      score: 0,
      status: 'empty',
    });
  }

  const emotionCounts: Record<string, number> = {};
  let totalEmotionsCount = 0;

  entries.forEach((entry) => {
    const entryDate = new Date(entry.date instanceof Date ? entry.date.getTime() : entry.date);
    entryDate.setHours(0, 0, 0, 0);

    const diffTime = entryDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays < days && entry.parsedData) {
      const status = entry.parsedData.goalImpactType || 'neutral';
      const score = GOAL_IMPACT_SCORE[status] ?? 50;
      goalHistory[diffDays] = {
        ...goalHistory[diffDays],
        score,
        status,
      };
      goalAlignmentSum += score;
      goalAlignmentCount++;

      if (Array.isArray(entry.parsedData.emotions)) {
        entry.parsedData.emotions.forEach((emo) => {
          const normalized = emo.trim().toLowerCase();
          if (normalized.length > 0) {
            emotionCounts[normalized] = (emotionCounts[normalized] || 0) + 1;
            totalEmotionsCount++;
          }
        });
      }
    }
  });

  const goalAlignment = goalAlignmentCount > 0 ? Math.round(goalAlignmentSum / goalAlignmentCount) : 0;

  const dominantEmotions: EmotionCountPoint[] = Object.entries(emotionCounts)
    .map(([emotion, count]) => ({
      emotion,
      count,
      percentage: totalEmotionsCount > 0 ? Math.round((count / totalEmotionsCount) * 100) : 0,
      color: stringToColor(emotion),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return { goalAlignment, goalHistory, dominantEmotions };
}
