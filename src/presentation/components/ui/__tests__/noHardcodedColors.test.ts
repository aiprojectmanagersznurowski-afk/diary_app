import fs from 'fs';
import path from 'path';

const UI_DIR = path.join(__dirname, '..');
const SCREENS_DIR = path.join(__dirname, '..', '..', '..', 'screens');

/** Pliki, w których wolno trzymać literały kolorów: stałe semantyczne i narzędzia kolorów. */
const ALLOWED = new Set(['tokens.ts', 'colorUtils.ts']);

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

function sourceFiles(dir: string, only?: string[]): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => /\.tsx?$/.test(f) && !ALLOWED.has(f))
    .filter((f) => !only || only.includes(f))
    .map((f) => path.join(dir, f));
}

describe('brak zahardkodowanych kolorów w komponentach (docs/08-design-ui.md §0.3)', () => {
  const files = [...sourceFiles(UI_DIR), ...sourceFiles(SCREENS_DIR, ['LoginScreen.tsx', 'OnboardingScreen.tsx'])];

  it('znajduje pliki do sprawdzenia', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map((f) => [path.basename(f), f]))('%s nie zawiera literałów kolorów', (_name, file) => {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const offending = lines
      .map((text, i) => ({ text, line: i + 1 }))
      .filter(({ text }) => !text.trim().startsWith('//') && !text.trim().startsWith('*') && COLOR_LITERAL.test(text));
    expect(offending).toEqual([]);
  });
});
