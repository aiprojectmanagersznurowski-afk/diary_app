import { DiaryEntry } from '../../domain/models/DiaryEntry';
import { DailyDocument } from '../../domain/models/DailyDocument';

const APPLE_PASTEL_PALETTE = [
  '#FF9AA2',
  '#FFB7B2',
  '#FFDAC1',
  '#E2F0CB',
  '#B5EAD7',
  '#C7CEEA',
  '#A1C9F1',
  '#F4A261',
  '#2A9D8F',
];

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % APPLE_PASTEL_PALETTE.length;
  return APPLE_PASTEL_PALETTE[index];
}

export interface ChartDataPoint {
  value: number;
  color: string;
  text: string;
}

export interface LineChartPoint {
  value: number;
  dataPointText?: string;
  label?: string;
}

export interface AnalyticsData {
  stress: LineChartPoint[];
  calm: LineChartPoint[];
  energy: LineChartPoint[];
  goalAlignment: number;
  avgStress: number;
  avgCalm: number;
  avgEnergy: number;
}

const DAYS_PL = ['Nie', 'Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob'];

const GOAL_IMPACT_SCORE: Record<DailyDocument['goalImpactType'], number> = {
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

/** Tekst podsumowujący poziom energii (brief §2.8). */
export function getEnergyNote(energy: LineChartPoint[]): string {
  if (energy.length === 0) return 'Stabilna';
  let maxIdx = -1;
  let maxVal = 0;
  for (let i = 0; i < energy.length; i++) {
    if (energy[i].value > maxVal) {
      maxVal = energy[i].value;
      maxIdx = i;
    }
  }
  if (maxIdx >= 0 && maxVal > 0 && energy[maxIdx].label) {
    return `Najwyższa w ${energy[maxIdx].label}`;
  }
  return 'Stabilna';
}

/** Komunikat obok pierścienia zgodności z celami w zależności od procentu (brief §2.8). */
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
 * build-daily (docs/02-architektura.md §6.3). Dzień bez wpisu zostaje po prostu pusty (brak
 * wpisu w mapie), zgodność z celami liczona jest wyłącznie z pola goalImpactType każdego wpisu —
 * bez heurystyk klienta.
 */
export function getDailyAnalyticsData(dailyDocs: DailyDocument[], days: 7 | 30): AnalyticsData {
  const byDay = new Map(dailyDocs.map((doc) => [doc.day, doc]));

  const stress: LineChartPoint[] = [];
  const calm: LineChartPoint[] = [];
  const energy: LineChartPoint[] = [];
  let goalAlignmentSum = 0;
  let goalAlignmentCount = 0;
  let stressSum = 0;
  let calmSum = 0;
  let energySum = 0;
  let entriesCount = 0;

  for (let i = 0; i < days; i++) {
    const day = dayStringOffsetFromToday(i - (days - 1));
    const [y, m, d] = day.split('-').map(Number);
    const dayStr = day.slice(8, 10);
    const weekday = new Date(y, m - 1, d).getDay();
    const label = days === 7 ? DAYS_PL[weekday] : i % 5 === 0 ? dayStr : '';

    const doc = byDay.get(day);
    if (!doc) {
      stress.push({ value: 0, label });
      calm.push({ value: 0, label });
      energy.push({ value: 0, label });
      continue;
    }

    let stressValue = 0;
    let calmValue = 0;
    if (doc.stressVsCalm === 'stress') {
      stressValue = 50;
    } else if (doc.stressVsCalm === 'calm') {
      calmValue = 50;
    } else {
      stressValue = 10;
      calmValue = 10;
    }

    stress.push({
      value: stressValue,
      label,
      dataPointText: days === 7 && stressValue > 0 ? stressValue.toString() : undefined,
    });
    calm.push({
      value: calmValue,
      label,
      dataPointText: days === 7 && calmValue > 0 ? calmValue.toString() : undefined,
    });

    const fatigue = doc.fatigueLevel || 5;
    const energyValue = Math.max(0, 100 - fatigue * 10);
    energy.push({ value: energyValue, label });

    stressSum += stressValue;
    calmSum += calmValue;
    energySum += energyValue;
    entriesCount++;

    goalAlignmentSum += GOAL_IMPACT_SCORE[doc.goalImpactType];
    goalAlignmentCount++;
  }

  const goalAlignment = goalAlignmentCount > 0 ? Math.round(goalAlignmentSum / goalAlignmentCount) : 0;
  const avgStress = entriesCount > 0 ? Math.round(stressSum / entriesCount) : 0;
  const avgCalm = entriesCount > 0 ? Math.round(calmSum / entriesCount) : 0;
  const avgEnergy = entriesCount > 0 ? Math.round(energySum / entriesCount) : 0;

  // Wygładzenie wykresu energii, żeby dni bez wpisu nie spadały ostro do zera
  for (let i = 1; i < days; i++) {
    if (energy[i].value === 0 && energy[i - 1].value > 0) {
      energy[i].value = energy[i - 1].value;
    }
  }

  return { stress, calm, energy, goalAlignment, avgStress, avgCalm, avgEnergy };
}

/**
 * Wersja historyczna, oparta na DiaryEntry (stary model, wciąż zasilający HomeScreen — poza
 * zakresem tego zadania). Poprawiono tu oba znane błędy z docs/04-roadmapa.md: (1) nie mutuje już
 * `entry.date` w stanie aplikacji (kopiuje datę przed setHours), (2) zgodność z celami liczy się
 * z prawdziwego pola goalImpactType zamiast heurystyki z emocji/zadań.
 */
export function getAnalyticsData(entries: DiaryEntry[], days: 7 | 30): AnalyticsData {
  const now = new Date();
  const startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  const stress: LineChartPoint[] = [];
  const calm: LineChartPoint[] = [];
  const energy: LineChartPoint[] = [];
  let goalAlignmentSum = 0;
  let goalAlignmentCount = 0;

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dayName = DAYS_PL[currentDate.getDay()];
    const dateNum = currentDate.getDate().toString().padStart(2, '0');
    const label = days === 7 ? dayName : i % 5 === 0 ? dateNum : '';

    stress.push({ value: 0, label });
    calm.push({ value: 0, label });
    energy.push({ value: 0, label });
  }

  entries.forEach((entry) => {
    // Kopia daty przed setHours — entry.date (obiekt Date w stanie useDiaryStore) nigdy nie jest mutowany.
    const entryDate = new Date(entry.date instanceof Date ? entry.date.getTime() : entry.date);
    entryDate.setHours(0, 0, 0, 0);

    const diffTime = entryDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays < days && entry.parsedData) {
      if (entry.parsedData.stressVsCalm === 'stress') {
        stress[diffDays].value = Math.min(100, stress[diffDays].value + 50);
      } else if (entry.parsedData.stressVsCalm === 'calm') {
        calm[diffDays].value = Math.min(100, calm[diffDays].value + 50);
      } else {
        stress[diffDays].value = Math.min(100, stress[diffDays].value + 10);
        calm[diffDays].value = Math.min(100, calm[diffDays].value + 10);
      }

      if (days === 7) {
        stress[diffDays].dataPointText = stress[diffDays].value > 0 ? stress[diffDays].value.toString() : undefined;
        calm[diffDays].dataPointText = calm[diffDays].value > 0 ? calm[diffDays].value.toString() : undefined;
      }

      const fatigue = entry.parsedData.fatigueLevel || 5;
      energy[diffDays].value = Math.max(0, 100 - fatigue * 10);

      goalAlignmentSum += GOAL_IMPACT_SCORE[entry.parsedData.goalImpactType];
      goalAlignmentCount++;
    }
  });

  const goalAlignment = goalAlignmentCount > 0 ? Math.round(goalAlignmentSum / goalAlignmentCount) : 0;

  for (let i = 1; i < days; i++) {
    if (energy[i].value === 0 && energy[i - 1].value > 0) {
      energy[i].value = energy[i - 1].value;
    }
  }

  const avgStress =
    goalAlignmentCount > 0 ? Math.round(stress.reduce((a, b) => a + b.value, 0) / goalAlignmentCount) : 0;
  const avgCalm = goalAlignmentCount > 0 ? Math.round(calm.reduce((a, b) => a + b.value, 0) / goalAlignmentCount) : 0;
  const avgEnergy =
    goalAlignmentCount > 0 ? Math.round(energy.reduce((a, b) => a + b.value, 0) / goalAlignmentCount) : 0;

  return { stress, calm, energy, goalAlignment, avgStress, avgCalm, avgEnergy };
}

// Keep this for backward compatibility if used elsewhere
export function getWeeklyEmotions(entries: DiaryEntry[]): ChartDataPoint[] {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentEntries = entries.filter((entry) => {
    const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
    return entryDate >= sevenDaysAgo && entryDate <= now;
  });

  const emotionCounts: Record<string, number> = {};
  recentEntries.forEach((entry) => {
    if (entry.parsedData && entry.parsedData.emotions) {
      entry.parsedData.emotions.forEach((emotion) => {
        const normalized = emotion.toLowerCase().trim();
        if (normalized) emotionCounts[normalized] = (emotionCounts[normalized] || 0) + 1;
      });
    }
  });

  const chartData: ChartDataPoint[] = Object.entries(emotionCounts).map(([emotion, count]) => ({
    value: count,
    color: stringToColor(emotion),
    text: emotion.charAt(0).toUpperCase() + emotion.slice(1),
  }));

  chartData.sort((a, b) => b.value - a.value);
  return chartData;
}

export function getWeeklyCalmPercentage(entries: DiaryEntry[]): number {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentEntries = entries.filter((entry) => {
    const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
    return entryDate >= sevenDaysAgo && entryDate <= now;
  });

  if (recentEntries.length === 0) return 0;

  const calmCount = recentEntries.filter((e) => e.parsedData?.stressVsCalm === 'calm').length;
  return Math.round((calmCount / recentEntries.length) * 100);
}

/** Odsetek spokojnych dni (stressVsCalm = 'calm') wśród wpisów dnia z ostatnich 7 dni, liczony z documents. */
export function getDailyCalmPercentage(dailyDocs: DailyDocument[]): number {
  const startDay = dayStringOffsetFromToday(-6);
  const recent = dailyDocs.filter((doc) => doc.day >= startDay);
  if (recent.length === 0) return 0;
  const calmCount = recent.filter((doc) => doc.stressVsCalm === 'calm').length;
  return Math.round((calmCount / recent.length) * 100);
}
