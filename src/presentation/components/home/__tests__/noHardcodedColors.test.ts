import fs from 'fs';
import path from 'path';

const COMPONENTS = path.join(__dirname, '..', '..');
const SCREENS = path.join(COMPONENTS, '..', 'screens');

const NAMED = 'white|black|red|green|blue|gray|grey|orange|yellow|purple|pink';
const COLOR_LITERAL = new RegExp(`#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?)\\(|['"](?:${NAMED})['"]`);

const FILES = [
  ...fs
    .readdirSync(path.join(COMPONENTS, 'home'))
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => path.join(COMPONENTS, 'home', f)),
  path.join(COMPONENTS, 'RecordingOverlay.tsx'),
  path.join(COMPONENTS, 'BadgeAlertModal.tsx'),
  path.join(COMPONENTS, 'NotesList.tsx'),
  path.join(COMPONENTS, 'RecordingStatusList.tsx'),
  path.join(SCREENS, 'HomeScreen.tsx'),
  path.join(SCREENS, 'RecordingsScreen.tsx'),
];

describe('ekran główny i Nagrania: brak zahardkodowanych kolorów (docs/08-design-ui.md §0.3)', () => {
  it.each(FILES.map((f) => [path.relative(path.join(COMPONENTS, '..'), f), f]))(
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
