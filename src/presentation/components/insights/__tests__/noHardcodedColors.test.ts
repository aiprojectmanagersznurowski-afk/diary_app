import fs from 'fs';
import path from 'path';

const INSIGHTS_DIR = path.join(__dirname, '..');
const SCREEN_FILE = path.join(INSIGHTS_DIR, '..', '..', 'screens', 'InsightsScreen.tsx');

const ALLOWED = new Set(['chartLogic.ts']);

const NAMED = 'white|black|red|green|blue|gray|grey|orange|yellow|purple|pink';
const COLOR_LITERAL = new RegExp(`#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?)\\(|['"](?:${NAMED})['"]`);

const FILES = [
  ...fs
    .readdirSync(INSIGHTS_DIR)
    .filter((f) => /\.tsx?$/.test(f) && !ALLOWED.has(f))
    .map((f) => path.join(INSIGHTS_DIR, f)),
  SCREEN_FILE,
];

describe('ekran analiz: brak zahardkodowanych kolorów (docs/08-design-ui.md §0.3)', () => {
  it.each(FILES.map((f) => [path.relative(path.join(INSIGHTS_DIR, '..', '..'), f), f]))(
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
