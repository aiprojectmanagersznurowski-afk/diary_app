export interface Point {
  x: number;
  y: number;
}

/**
 * Przelicza wartości z punktów danych na współrzędne w układzie SVG.
 * @param values Tablica wartości (0-100)
 * @param width Szerokość widoku SVG
 * @param height Wysokość widoku SVG
 * @param padding Margines pionowy
 */
export function buildChartPoints(
  values: number[],
  width: number,
  height: number,
  padding: { top: number; bottom: number; left: number; right: number } = {
    top: 10,
    bottom: 10,
    left: 0,
    right: 0,
  },
  maxVal = 100,
): Point[] {
  if (values.length === 0) return [];
  const usableWidth = Math.max(1, width - padding.left - padding.right);
  const usableHeight = Math.max(1, height - padding.top - padding.bottom);
  const step = values.length > 1 ? usableWidth / (values.length - 1) : 0;

  return values.map((val, idx) => {
    const clamped = Math.max(0, Math.min(maxVal, val));
    const ratio = maxVal > 0 ? clamped / maxVal : 0;
    const x = padding.left + idx * step;
    const y = padding.top + (1 - ratio) * usableHeight;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  });
}

/**
 * Tworzy wygładzoną ścieżkę SVG (krzywa Béziera) łączącą punkty.
 */
export function smoothLinePath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    path += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return path;
}

/**
 * Tworzy ścieżkę zamkniętego obszaru pod wygładzoną linią (do wypełnienia gradientem).
 */
export function smoothAreaPath(points: Point[], bottomY: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  const line = smoothLinePath(points);

  return `M ${first.x} ${bottomY} L ${first.x} ${first.y} ${line.slice(line.indexOf('C'))} L ${last.x} ${bottomY} Z`;
}

/**
 * Oblicza parametry pierścienia SVG (obwód i przesunięcie dla danego procentu).
 */
export function calculateRingProgress(
  radius: number,
  percentage: number,
): {
  circumference: number;
  strokeDashoffset: number;
} {
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  return { circumference, strokeDashoffset };
}
