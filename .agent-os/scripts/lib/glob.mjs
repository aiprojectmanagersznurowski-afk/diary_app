// Minimalny matcher globów bez zależności.
// ** = dowolna liczba segmentów, * = znaki w obrębie segmentu, ? = jeden znak,
// {a,b} = alternatywa, prefiks ! = wyjątek (negacja) w matchAny.

const cache = new Map();

export function expandBraces(glob) {
  const open = glob.indexOf('{');
  if (open < 0) return [glob];
  let depth = 0;
  for (let i = open; i < glob.length; i++) {
    if (glob[i] === '{') depth++;
    else if (glob[i] === '}' && --depth === 0) {
      const inner = glob.slice(open + 1, i);
      const parts = [];
      let d = 0, start = 0;
      for (let j = 0; j < inner.length; j++) {
        if (inner[j] === '{') d++;
        else if (inner[j] === '}') d--;
        else if (inner[j] === ',' && d === 0) { parts.push(inner.slice(start, j)); start = j + 1; }
      }
      parts.push(inner.slice(start));
      const pre = glob.slice(0, open), post = glob.slice(i + 1);
      return parts.flatMap(p => expandBraces(pre + p + post));
    }
  }
  return [glob];
}

function esc(c) { return /[.+^${}()|[\]\\]/.test(c) ? '\\' + c : c; }

function single(glob) {
  let re = '';
  for (let i = 0; i < glob.length; ) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 3; continue; }
        re += '.*'; i += 2; continue;
      }
      re += '[^/]*'; i++; continue;
    }
    if (c === '?') { re += '[^/]'; i++; continue; }
    re += esc(c); i++;
  }
  return re;
}

export function globToRegExp(glob) {
  if (cache.has(glob)) return cache.get(glob);
  const rx = new RegExp('^(?:' + expandBraces(glob).map(single).join('|') + ')$');
  cache.set(glob, rx);
  return rx;
}

export function match(path, glob) {
  return globToRegExp(glob).test(path);
}

/** true, jeśli ścieżka pasuje do któregoś wzorca pozytywnego i do żadnego z "!wzorzec". */
export function matchAny(path, globs = []) {
  if (!globs || !globs.length) return false;
  let pos = false;
  for (const g of globs) {
    if (g.startsWith('!')) { if (match(path, g.slice(1))) return false; }
    else if (!pos && match(path, g)) pos = true;
  }
  return pos;
}
