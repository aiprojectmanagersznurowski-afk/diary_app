export interface ParsedColor {
  /** Kolor bez alfy w formacie rgb(r,g,b) albo oryginalny hex. */
  rgb: string;
  alpha: number;
}

/** Rozbija `rgba(r,g,b,a)` na kolor i alfę (dla RadialGradient w SVG); inne formaty zwraca z alfą 1. */
export function parseColor(color: string): ParsedColor {
  const m = color.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i);
  if (m) {
    return { rgb: `rgb(${m[1]},${m[2]},${m[3]})`, alpha: Math.min(1, Math.max(0, parseFloat(m[4]))) };
  }
  return { rgb: color, alpha: 1 };
}

/** Dodaje alfę do koloru hex (#RRGGBB); `alpha` w zakresie 0–1. */
export function withAlpha(hex: string, alpha: number): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${m[1]}${a}`;
}
