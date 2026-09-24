// Minimalny parser YAML bez zależności: podzbiór używany w kontraktach Agent OS.
// Obsługuje: mapy i listy blokowe, listy/mapy w stylu flow ([a, b], { k: v }),
// skalary w cudzysłowach '…' i "…", skalary blokowe | i >, komentarze #, liczby, true/false/null.
// Nie obsługuje: kotwic, tagów, wielu dokumentów, kluczy złożonych.

class YamlError extends Error {}

function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (q === '"' && c === '\\') { i++; continue; }
      if (c === q) { if (q === "'" && line[i + 1] === "'") { i++; continue; } q = null; }
    } else if (c === '"' || c === "'") {
      if (i === 0 || /[\s\[{,:-]/.test(line[i - 1])) q = c;
    } else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i).replace(/\s+$/, '');
    }
  }
  return line.replace(/\s+$/, '');
}

function scalar(raw) {
  const s = raw.trim();
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if (s[0] === '"') return JSON.parse(s.replace(/\\\//g, '/').replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1'));
  if (s[0] === "'") {
    if (!s.endsWith("'")) throw new YamlError(`niezamknięty cudzysłów: ${s}`);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s[0] === '[' || s[0] === '{') return flow(s);
  return s;
}

// --- styl flow ---
function flow(src) {
  let i = 0;
  const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
  function value(stop) {
    ws();
    if (src[i] === '[') return seq();
    if (src[i] === '{') return map();
    if (src[i] === '"' || src[i] === "'") {
      const q = src[i]; let j = i + 1;
      while (j < src.length) {
        if (q === '"' && src[j] === '\\') { j += 2; continue; }
        if (src[j] === q) { if (q === "'" && src[j + 1] === "'") { j += 2; continue; } break; }
        j++;
      }
      const s = src.slice(i, j + 1); i = j + 1; return scalar(s);
    }
    let j = i;
    while (j < src.length && !stop.includes(src[j])) j++;
    const s = src.slice(i, j); i = j; return scalar(s);
  }
  function seq() {
    i++; const out = []; ws();
    if (src[i] === ']') { i++; return out; }
    for (;;) {
      out.push(value(',]')); ws();
      if (src[i] === ',') { i++; ws(); if (src[i] === ']') { i++; return out; } continue; }
      if (src[i] === ']') { i++; return out; }
      throw new YamlError(`błąd listy flow: ${src}`);
    }
  }
  function map() {
    i++; const out = {}; ws();
    if (src[i] === '}') { i++; return out; }
    for (;;) {
      ws();
      let key;
      if (src[i] === '"' || src[i] === "'") key = value(':');
      else { let j = i; while (j < src.length && src[j] !== ':') j++; key = src.slice(i, j).trim(); i = j; }
      ws(); if (src[i] !== ':') throw new YamlError(`brak ":" w mapie flow: ${src}`); i++;
      out[key] = value(',}'); ws();
      if (src[i] === ',') { i++; continue; }
      if (src[i] === '}') { i++; return out; }
      throw new YamlError(`błąd mapy flow: ${src}`);
    }
  }
  const v = value('');
  ws();
  if (i < src.length) throw new YamlError(`nadmiarowe znaki: ${src.slice(i)}`);
  return v;
}

// --- styl blokowy ---
export function parse(text) {
  const rawLines = text.replace(/\r\n?/g, '\n').replace(/\t/g, '  ').split('\n');
  const lines = rawLines.map((raw, n) => ({ raw, n: n + 1 }));
  let p = 0;

  const indentOf = (s) => s.length - s.trimStart().length;
  const meaningful = () => {
    while (p < lines.length) {
      const t = stripComment(lines[p].raw);
      if (t.trim() === '' || t.trim() === '---') { p++; continue; }
      return { text: t, indent: indentOf(t), n: lines[p].n };
    }
    return null;
  };

  function blockScalar(style, parentIndent) {
    const out = [];
    let ind = null;
    while (p < lines.length) {
      const raw = lines[p].raw;
      if (raw.trim() === '') { out.push(''); p++; continue; }
      const k = indentOf(raw);
      if (k <= parentIndent) break;
      if (ind === null) ind = k;
      out.push(raw.slice(Math.min(ind, k)));
      p++;
    }
    while (out.length && out[out.length - 1] === '') out.pop();
    return style === '|' ? out.join('\n') + '\n' : out.join(' ').replace(/ \n /g, '\n') + '\n';
  }

  function inlineValue(rest, indent) {
    const r = rest.trim();
    if (r === '|' || r === '|-' || r === '>' || r === '>-') {
      const v = blockScalar(r[0], indent);
      return r.endsWith('-') ? v.replace(/\n$/, '') : v;
    }
    if (r === '') return parseBlock(indent);
    // wieloliniowy flow: [ ... ] rozciągnięty na linie
    if ((r[0] === '[' || r[0] === '{') && !balanced(r)) {
      let acc = r;
      while (p < lines.length && !balanced(acc)) acc += ' ' + stripComment(lines[p++].raw).trim();
      return flow(acc);
    }
    return scalar(r);
  }

  function balanced(s) {
    let d = 0, q = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (q === '"' && c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") q = c;
      else if (c === '[' || c === '{') d++;
      else if (c === ']' || c === '}') d--;
    }
    return d === 0;
  }

  function splitKey(t) {
    // klucz: wartość (klucz może być w cudzysłowie)
    const s = t.trimStart();
    let key, rest;
    if (s[0] === '"' || s[0] === "'") {
      const end = s.indexOf(s[0], 1);
      key = scalar(s.slice(0, end + 1)); rest = s.slice(end + 1);
      if (!/^\s*:(\s|$)/.test(rest)) return null;
      rest = rest.replace(/^\s*:/, '');
    } else {
      const m = /^([^\s:\[\]{},#][^:#]*?)\s*:(?:\s+|$)(.*)$/.exec(s);
      if (!m) return null;
      key = m[1]; rest = m[2];
    }
    return { key, rest };
  }

  function parseBlock(parentIndent) {
    const first = meaningful();
    if (!first || first.indent <= parentIndent) {
      // pusta wartość; wyjątek: lista na tym samym wcięciu co klucz rodzica
      if (first && first.indent === parentIndent && first.text.trimStart().startsWith('- ')) return parseSeq(first.indent);
      if (first && first.indent === parentIndent && first.text.trim() === '-') return parseSeq(first.indent);
      return null;
    }
    const t = first.text.trimStart();
    if (t === '-' || t.startsWith('- ')) return parseSeq(first.indent);
    return parseMap(first.indent);
  }

  function parseSeq(indent) {
    const out = [];
    for (;;) {
      const l = meaningful();
      if (!l || l.indent !== indent) break;
      const t = l.text.trimStart();
      if (!(t === '-' || t.startsWith('- '))) break;
      p++;
      const rest = t === '-' ? '' : t.slice(2);
      if (rest.trim() === '') { out.push(parseBlock(indent)); continue; }
      const kv = /^[\[{"']/.test(rest.trim()) ? null : splitKey(rest);
      if (kv) {
        // mapa rozpoczęta w linii elementu listy
        const itemIndent = indent + 2 + (rest.length - rest.trimStart().length);
        const obj = {};
        obj[kv.key] = inlineValue(kv.rest, itemIndent);
        const more = meaningful();
        if (more && more.indent === itemIndent && !more.text.trimStart().startsWith('- ')) Object.assign(obj, parseMap(itemIndent));
        out.push(obj);
      } else out.push(inlineValue(rest, indent));
    }
    return out;
  }

  function parseMap(indent) {
    const out = {};
    for (;;) {
      const l = meaningful();
      if (!l || l.indent < indent) break;
      if (l.indent > indent) throw new YamlError(`linia ${l.n}: nieoczekiwane wcięcie`);
      const t = l.text.trimStart();
      if (t.startsWith('- ')) break;
      const kv = splitKey(t);
      if (!kv) throw new YamlError(`linia ${l.n}: oczekiwano "klucz: wartość"`);
      p++;
      out[kv.key] = inlineValue(kv.rest, indent);
    }
    return out;
  }

  const v = parseBlock(-1);
  const rest = meaningful();
  if (rest) throw new YamlError(`linia ${rest.n}: nie udało się sparsować`);
  return v;
}

export default { parse };
