import { execFileSync } from 'node:child_process';

export function git(root, args, { allowFail = false } = {}) {
  try {
    return execFileSync('git', args, {
      cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
    }).replace(/\n$/, '');
  } catch (e) {
    if (allowFail) return null;
    throw new Error(`git ${args.join(' ')}: ${(e.stderr || e.message || '').toString().trim()}`);
  }
}

export function repoRoot(cwd = process.cwd()) {
  return git(cwd, ['rev-parse', '--show-toplevel']);
}

export function currentBranch(root) {
  if (process.env.GITHUB_HEAD_REF) return process.env.GITHUB_HEAD_REF;
  const b = git(root, ['rev-parse', '--abbrev-ref', 'HEAD'], { allowFail: true });
  if (b && b !== 'HEAD') return b;
  // świeże repo bez commitów
  return git(root, ['symbolic-ref', '--short', 'HEAD'], { allowFail: true }) || 'HEAD';
}

export function refExists(root, ref) {
  return git(root, ['rev-parse', '--verify', '--quiet', ref + '^{commit}'], { allowFail: true }) !== null;
}

/** Parsuje `git diff --name-status -M -z` */
export function parseNameStatus(out) {
  const files = [];
  if (!out) return files;
  const parts = out.split('\0').filter(p => p !== '');
  for (let i = 0; i < parts.length; ) {
    const st = parts[i++];
    const code = st[0];
    if (code === 'R' || code === 'C') {
      const oldPath = parts[i++], path = parts[i++];
      files.push({ status: code, oldPath, path });
    } else {
      files.push({ status: code, path: parts[i++] });
    }
  }
  return files;
}

/** Parsuje `git diff -U0` na linie dodane (numeracja nowego pliku) i usunięte (numeracja starego). */
export function parseUnified(out) {
  const added = [], removed = [];
  if (!out) return { added, removed };
  let oldLine = 0, newLine = 0, inHunk = false;
  for (const line of out.split('\n')) {
    const h = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (h) { oldLine = +h[1]; newLine = +h[2]; inHunk = true; continue; }
    if (!inHunk) continue;
    if (line.startsWith('diff --git')) { inHunk = false; continue; }
    if (line.startsWith('+') && !line.startsWith('+++')) added.push({ line: newLine++, text: line.slice(1) });
    else if (line.startsWith('-') && !line.startsWith('---')) removed.push({ line: oldLine++, text: line.slice(1) });
    else if (line.startsWith(' ')) { oldLine++; newLine++; }
  }
  return { added, removed };
}
