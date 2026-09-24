export const error = (file, msg, line) => ({ level: 'error', file, line, msg });
export const warn = (file, msg, line) => ({ level: 'warn', file, line, msg });
export const checkpoint = (id, file, msg) => ({ level: 'checkpoint', id, file, msg });

/** Specyfikatory importów w linii (ES import/export, dynamic import, require). */
export function importSpecs(line) {
  const out = [];
  const rx = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)(['"])([^'"]+)\1/g;
  let m;
  while ((m = rx.exec(line))) out.push(m[2]);
  return out;
}

/** Nazwa pakietu ze specyfikatora (obsługa npm:, jsr:, wersji, esm.sh). */
export function packageName(spec) {
  let s = spec.replace(/^(npm|jsr|node):/, '');
  const url = /^https?:\/\/(?:esm\.sh|cdn\.skypack\.dev|esm\.run|unpkg\.com|cdn\.jsdelivr\.net\/npm)\/(.+)$/.exec(s);
  if (url) s = url[1];
  else if (/^https?:/.test(s)) return null;
  const segs = s.split('/');
  if (s.startsWith('@')) return segs[0] + '/' + (segs[1] || '').replace(/@.*$/, '');
  return segs[0].replace(/@.*$/, '');
}

export function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

export function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text || '');
  if (!m) return null;
  const obj = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*?)\s*(#.*)?$/.exec(line);
    if (kv) obj[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
  }
  return obj;
}
