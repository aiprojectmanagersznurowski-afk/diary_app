import fs from 'fs';
import path from 'path';

const UI_DIR = path.join(__dirname, '..');
const SCREENS_DIR = path.join(__dirname, '..', '..', '..', 'screens');

/** Pliki, w których wolno trzymać literały kolorów: stałe semantyczne i narzędzia kolorów. */
const ALLOWED = new Set(['tokens.ts', 'colorUtils.ts']);

const NAMED = 'white|black|red|green|blue|gray|grey|orange|yellow|purple|pink';
const COLOR_LITERAL = new RegExp(`#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?)\\(|['"](?:${NAMED})['"]`);

function sourceFiles(dir: string, only?: string[]): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full, only);
    if (!/\.tsx?$/.test(entry.name) || ALLOWED.has(entry.name)) return [];
    if (only && !only.includes(entry.name)) return [];
    return [full];
  });
}

describe('brak zahardkodowanych kolorów w komponentach (docs/08-design-ui.md §0.3)', () => {
  const files = [...sourceFiles(UI_DIR), ...sourceFiles(SCREENS_DIR, ['LoginScreen.tsx', 'OnboardingScreen.tsx'])];

  it('znajduje pliki do sprawdzenia', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('wykrywa literały kolorów w różnych zapisach (test własny wzorca)', () => {
    for (const bad of ["'#fff'", "'#A78BFA'", "'rgba(0,0,0,0.5)'", "'hsl(10, 50%, 50%)'", "'white'", '"black"']) {
      expect(COLOR_LITERAL.test(`color: ${bad}`)).toBe(true);
    }
    for (const ok of ["'transparent'", 'colors.text', "name: 'chevron-left'"]) {
      expect(COLOR_LITERAL.test(`color: ${ok}`)).toBe(false);
    }
  });

  it.each(files.map((f) => [path.basename(f), f]))('%s nie zawiera literałów kolorów', (_name, file) => {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const offending = lines
      .map((text, i) => ({ text, line: i + 1 }))
      .filter(({ text }) => !text.trim().startsWith('//') && !text.trim().startsWith('*') && COLOR_LITERAL.test(text));
    expect(offending).toEqual([]);
  });
});
