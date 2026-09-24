#!/usr/bin/env node
// Wpina bramki Agent OS do hooków git (Husky v9: pliki w .husky/). Idempotentne.
// Bez Husky: ustawia core.hooksPath na .husky i tworzy pliki.
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot, git } from './lib/git.mjs';

const root = repoRoot();
const dir = path.join(root, '.husky');
const BEGIN = '# >>> agent-os (nie edytuj: node .agent-os/scripts/install-hooks.mjs)';
const END = '# <<< agent-os';

const HOOKS = {
  'pre-commit': 'node .agent-os/scripts/gate.mjs --staged || exit 1',
  'commit-msg': 'node .agent-os/scripts/gate.mjs --commit-msg "$1" || exit 1',
  'pre-push': 'node .agent-os/scripts/gate.mjs --base || exit 1',
};

fs.mkdirSync(dir, { recursive: true });
for (const [name, cmd] of Object.entries(HOOKS)) {
  const file = path.join(dir, name);
  let body = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  body = body.replace(new RegExp(`\\n?${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END}\\n?`), '\n');
  const block = `${BEGIN}\n${cmd}\n${END}\n`;
  // bramki przed resztą hooka (np. lint-staged), żeby dawały szybką informację
  const lines = body.split('\n');
  const shebang = lines[0].startsWith('#!') ? lines.shift() + '\n' : '';
  const rest = lines.join('\n').replace(/^\n+/, '');
  fs.writeFileSync(file, `${shebang}${block}${rest ? '\n' + rest : ''}`.replace(/\n{3,}/g, '\n\n'));
  fs.chmodSync(file, 0o755);
  console.log(`✔ .husky/${name}`);
}

const hooksPath = git(root, ['config', '--get', 'core.hooksPath'], { allowFail: true });
if (!hooksPath) {
  const pkg = path.join(root, 'package.json');
  const usesHusky = fs.existsSync(pkg) && /"husky"/.test(fs.readFileSync(pkg, 'utf8'));
  if (usesHusky) console.log('ℹ uruchom "npx husky", żeby aktywować hooki (albo npm install, jeśli masz skrypt prepare)');
  else { git(root, ['config', 'core.hooksPath', '.husky']); console.log('✔ core.hooksPath = .husky'); }
}
