import { DiaryEntry } from '../../domain/models/DiaryEntry';

const APPLE_PASTEL_PALETTE = [
  '#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#A1C9F1', '#F4A261', '#2A9D8F',
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
}

const DAYS_PL = ['Nie', 'Pon', 'Wto', 'Śro', 'Czw', 'Pią', 'Sob'];

export function getAnalyticsData(entries: DiaryEntry[], days: 7 | 30): AnalyticsData {
  const now = new Date();
  const startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);

  // Initialize arrays with empty days
  const stress: LineChartPoint[] = [];
  const calm: LineChartPoint[] = [];
  const energy: LineChartPoint[] = [];
  let goalAlignmentSum = 0;
  let goalAlignmentCount = 0;

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dayName = DAYS_PL[currentDate.getDay()];
    const dateNum = currentDate.getDate().toString().padStart(2, '0');
    
    // Label logic: for 7 days show day name, for 30 days show date number every 5 days
    const label = days === 7 ? dayName : (i % 5 === 0 ? dateNum : '');

    stress.push({ value: 0, label });
    calm.push({ value: 0, label });
    energy.push({ value: 0, label });
  }

  // Populate data
  entries.forEach((entry) => {
    const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);

    const diffTime = entryDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays < days && entry.parsedData) {
      // 1. Stress vs Calm
      // Assuming 'stressVsCalm' is "stress", "calm", or "neutral"
      if (entry.parsedData.stressVsCalm === 'stress') {
        stress[diffDays].value += 50; // Add points to stress
      } else if (entry.parsedData.stressVsCalm === 'calm') {
        calm[diffDays].value += 50; // Add points to calm
      } else {
        stress[diffDays].value += 10;
        calm[diffDays].value += 10;
      }

      // Cap at 100
      stress[diffDays].value = Math.min(100, stress[diffDays].value);
      calm[diffDays].value = Math.min(100, calm[diffDays].value);

      // Data point text only for 7 days if value > 0 to not clutter
      if (days === 7) {
        stress[diffDays].dataPointText = stress[diffDays].value > 0 ? stress[diffDays].value.toString() : undefined;
        calm[diffDays].dataPointText = calm[diffDays].value > 0 ? calm[diffDays].value.toString() : undefined;
      }

      // 2. Energy
      // 'fatigueLevel' is 1-10. Energy is opposite of fatigue (100 - fatigue*10)
      const fatigue = entry.parsedData.fatigueLevel || 5;
      const energyLevel = Math.max(0, 100 - (fatigue * 10));
      energy[diffDays].value = energyLevel;

      // 3. Goal Alignment (Synthesize from sentiment for now)
      // Positive emotions or completed tasks increase alignment
      let alignmentScore = 50; // base
      if (entry.parsedData.emotions?.includes('Radość') || entry.parsedData.emotions?.includes('Spokój')) alignmentScore += 20;
      if (entry.parsedData.completedTasks && entry.parsedData.completedTasks.length > 0) alignmentScore += (entry.parsedData.completedTasks.length * 10);
      if (entry.parsedData.stressVsCalm === 'stress') alignmentScore -= 20;
      
      goalAlignmentSum += Math.min(100, Math.max(0, alignmentScore));
      goalAlignmentCount++;
    }
  });

  // Calculate average goal alignment
  const goalAlignment = goalAlignmentCount > 0 ? Math.round(goalAlignmentSum / goalAlignmentCount) : 0;

  // Smoothing for AreaChart (Energy) to avoid sharp drops to 0 on empty days
  for (let i = 1; i < days; i++) {
    if (energy[i].value === 0 && energy[i-1].value > 0) {
      energy[i].value = energy[i-1].value; // Carry over previous day's energy
    }
  }

  return { stress, calm, energy, goalAlignment };
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
  
  const calmCount = recentEntries.filter(e => e.parsedData?.stressVsCalm === 'calm').length;
  return Math.round((calmCount / recentEntries.length) * 100);
}
