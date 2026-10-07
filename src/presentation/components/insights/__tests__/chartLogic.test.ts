import { buildChartPoints, smoothLinePath, smoothAreaPath, calculateRingProgress } from '../chartLogic';

describe('chartLogic', () => {
  it('buildChartPoints generuje punkty w zadanym obszarze SVG', () => {
    const points = buildChartPoints([0, 50, 100], 300, 100, { top: 0, bottom: 0, left: 0, right: 0 });
    expect(points).toHaveLength(3);
    expect(points[0]).toEqual({ x: 0, y: 100 }); // 0% = dół
    expect(points[1]).toEqual({ x: 150, y: 50 }); // 50% = środek
    expect(points[2]).toEqual({ x: 300, y: 0 }); // 100% = góra
  });

  it('buildChartPoints zwraca pustą tablicę dla pustych danych', () => {
    expect(buildChartPoints([], 300, 100)).toEqual([]);
  });

  it('smoothLinePath generuje poprawną ścieżkę z krzywymi Béziera', () => {
    const points = [
      { x: 0, y: 100 },
      { x: 150, y: 50 },
      { x: 300, y: 0 },
    ];
    const path = smoothLinePath(points);
    expect(path).toContain('M 0 100');
    expect(path).toContain('C 75 100, 75 50, 150 50');
    expect(path).toContain('C 225 50, 225 0, 300 0');
  });

  it('smoothAreaPath domyka obszar do dolnej krawędzi', () => {
    const points = [
      { x: 0, y: 80 },
      { x: 100, y: 40 },
    ];
    const path = smoothAreaPath(points, 140);
    expect(path.startsWith('M 0 140 L 0 80')).toBe(true);
    expect(path.endsWith('L 100 140 Z')).toBe(true);
  });

  it('calculateRingProgress poprawnie oblicza obwód i przesunięcie dla okręgu', () => {
    const { circumference, strokeDashoffset } = calculateRingProgress(50, 50);
    const expectedCirc = 2 * Math.PI * 50;
    expect(circumference).toBeCloseTo(expectedCirc);
    expect(strokeDashoffset).toBeCloseTo(expectedCirc / 2);
  });
});
