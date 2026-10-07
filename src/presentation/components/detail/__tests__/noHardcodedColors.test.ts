import fs from 'fs';
import path from 'path';

const DETAIL_DIR = path.join(__dirname, '..');
const SCREEN_FILE = path.join(DETAIL_DIR, '..', '..', 'screens', 'DetailScreen.tsx');

/** Pliki, w których wolno trzymać literały kolorów: stałe semantyczne tokenów. */
const ALLOWED = new Set(['tokens.ts']);

const NAMED = 'white|black|red|green|blue|gray|grey|orange|yellow|purple|pink';
const COLOR_LITERAL = new RegExp(`#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?)\\(|['"](?:${NAMED})['"]`);

const FILES = [
  ...fs
    .readdirSync(DETAIL_DIR)
    .filter((f) => /\.tsx?$/.test(f) && !ALLOWED.has(f))
    .map((f) => path.join(DETAIL_DIR, f)),
  SCREEN_FILE,
];

describe('ekran szczegółów: brak zahardkodowanych kolorów (docs/08-design-ui.md §0.3)', () => {
  it.each(FILES.map((f) => [path.relative(path.join(DETAIL_DIR, '..', '..'), f), f]))(
    '%s nie zawiera literałów kolorów',
    (_name, file) => {
      const offending = fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .map((text, i) => ({ text, line: i + 1 }))
        .filter(
          ({ text }) => !text.trim().startsWith('//') && !text.trim().startsWith('*') && COLOR_LITERAL.test(text),
        );
      expect(offending).toEqual([]);
    },
  );
});
