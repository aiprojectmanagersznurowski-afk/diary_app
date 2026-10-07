import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..', '..', '..');
const ROOT = path.join(SRC, '..');
const FORBIDDEN = ['placeholder.supabase.co', 'placeholder-anon-key'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === '__tests__' || entry.name === 'node_modules' ? [] : sourceFiles(full);
    return /\.(ts|tsx|js)$/.test(entry.name) ? [full] : [];
  });
}

describe('brak wartości zastępczych adresu i klucza w kodzie (docs/09-audyt-gotowosci.md §2, ustalenie 2)', () => {
  const files = [...sourceFiles(SRC), path.join(ROOT, 'App.tsx'), path.join(ROOT, 'index.ts')];

  it('znajduje pliki do sprawdzenia', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(FORBIDDEN)('żaden plik źródłowy nie zawiera „%s”', (needle) => {
    const offenders = files
      .filter((file) => fs.readFileSync(file, 'utf8').includes(needle))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
