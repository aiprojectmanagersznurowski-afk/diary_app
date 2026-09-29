import { DigestOutput } from '../schemas/digest.ts';

export interface DailyMdContext {
  day: string; // YYYY-MM-DD
  personality: string; // AI personality name for frontmatter
  digest: DigestOutput;
  tags: string[];
  noteSlugs: { id: string; slug: string; title: string; time: string }[];
  recordingTimes: string[];
}

const POLISH_DAY_NAMES = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const POLISH_MONTH_NAMES = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];

/**
 * Formats a date string (YYYY-MM-DD) into a Polish heading like "Wtorek, 23 września 2026".
 */
function formatPolishDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = POLISH_DAY_NAMES[date.getDay()];
  const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return `${capitalized}, ${d} ${POLISH_MONTH_NAMES[m - 1]} ${y}`;
}

/**
 * Renders a bullet list with items; returns empty string if empty.
 */
function renderBulletList(items: string[]): string {
  if (!items || items.length === 0) return '';
  return items.map((item) => `- ${item}`).join('\n');
}

/**
 * Renders the daily entry Markdown file deterministically (ADR-004: no LLM in render).
 * Layout matches the spec in docs/02-architektura.md §5 "Wpis dnia".
 */
export function renderDailyMarkdown(ctx: DailyMdContext): string {
  const { day, personality, digest, tags, noteSlugs, recordingTimes } = ctx;

  // ── Frontmatter ──
  const lines: string[] = ['---'];
  lines.push('type: daily');
  lines.push(`date: ${day}`);

  const emotions = digest.emotions ?? [];
  lines.push(`emotions: [${emotions.join(', ')}]`);
  lines.push(`fatigue: ${digest.fatigueLevel}`);
  lines.push(`stress_vs_calm: ${digest.stressVsCalm}`);
  lines.push(`goal_impact: ${digest.goalImpactType}`);

  if (personality) {
    lines.push(`personality: ${personality}`);
  }

  lines.push(`tags: [${tags.join(', ')}]`);
  lines.push('---');

  // ── Title ──
  lines.push(`# ${formatPolishDate(day)}`);
  lines.push('');

  // ── Dominant thought ──
  lines.push(`> ${digest.dominantThought}`);
  lines.push('');

  // ── Podsumowanie ──
  lines.push('## Podsumowanie');
  lines.push(digest.summary);
  lines.push('');

  // ── 💡 Pomysły, na które wpadłem ──
  const ideas = digest.ideas ?? [];
  if (ideas.length > 0) {
    lines.push('## 💡 Pomysły, na które wpadłem');
    for (const idea of ideas) {
      // Znajdujemy slug notatki dla tego pomysłu (ADR-005: tylko istniejące ID z listy)
      const noteInfo = noteSlugs.find((n) => n.id === idea.documentId);
      if (noteInfo) {
        lines.push(`- [[${noteInfo.slug}|${idea.title}]] – ${idea.oneLiner}`);
      }
    }
    lines.push('');
  }

  // ── Zrobione ──
  const tasks = digest.completedTasks ?? [];
  lines.push('## Zrobione');
  if (tasks.length > 0) {
    lines.push(renderBulletList(tasks));
  }
  lines.push('');

  // ── Ważne wydarzenia ──
  const events = digest.importantEvents ?? [];
  lines.push('## Ważne wydarzenia');
  if (events.length > 0) {
    lines.push(renderBulletList(events));
  }
  lines.push('');

  // ── Emocje i wyzwalacze ──
  lines.push('## Emocje i wyzwalacze');
  const emotionTriggers = digest.emotionTriggers ?? [];
  if (emotionTriggers.length > 0) {
    for (const et of emotionTriggers) {
      lines.push(`- **${et.emotion}**: ${et.trigger}`);
    }
  }
  lines.push('');

  // ── Wdzięczność ──
  lines.push('## Wdzięczność');
  lines.push(digest.gratefulFor);
  lines.push('');

  // ── Wpływ na cele ──
  lines.push('## Wpływ na cele');
  lines.push(digest.impactOnGoals);
  lines.push('');

  // ── Rada ──
  if (digest.goalAdvice) {
    lines.push('## Rada');
    lines.push(digest.goalAdvice);
    lines.push('');
  }

  // ── Najważniejsze słowa ──
  const quotes = digest.quotes ?? [];
  if (quotes.length > 0) {
    lines.push('## Najważniejsze słowa');
    for (const q of quotes) {
      lines.push(`> ${q}`);
    }
    lines.push('');
  }

  // ── Nagrania dnia ──
  if (recordingTimes.length > 0) {
    lines.push('## Nagrania dnia');
    lines.push(`- ${recordingTimes.join(' · ')}`);
    lines.push('');
  }

  return lines.join('\n');
}
