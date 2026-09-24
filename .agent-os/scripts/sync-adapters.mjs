#!/usr/bin/env node
// Generuje pliki konfiguracyjne agentów z jednego źródła (.agent-os/ + AGENTS.md).
//
//   Claude Code : CLAUDE.md, .claude/settings.json, .claude/commands/os-*.md
//   Gemini CLI  : GEMINI.md, .gemini/settings.json, .gemini/commands/os-*.toml
//   Antigravity : GEMINI.md, .agents/rules/*.md, .agents/workflows/os-*.md
//
// Uruchamia człowiek po każdej zmianie w .agent-os/workflows, roles albo AGENTS.md.
// --check: tylko sprawdza, czy wygenerowane pliki są aktualne (CI / selftest).

import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './lib/git.mjs';
import { frontmatter } from './lib/util.mjs';
import { loadConfig } from './lib/context.mjs';

const root = repoRoot();
const OS = path.join(root, '.agent-os');
const check = process.argv.includes('--check');
const GEN = 'WYGENEROWANE przez .agent-os/scripts/sync-adapters.mjs: nie edytuj ręcznie';
const ANTIGRAVITY_RULE_LIMIT = 12000;

const outputs = new Map(); // ścieżka względna -> treść
const put = (rel, content) => outputs.set(rel, content.endsWith('\n') ? content : content + '\n');

const body = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
const agentsMd = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
const cfg = loadConfig(root);

const workflows = fs.readdirSync(path.join(OS, 'workflows')).filter(f => f.endsWith('.md')).sort().map(f => {
  const text = fs.readFileSync(path.join(OS, 'workflows', f), 'utf8');
  const fm = frontmatter(text) || {};
  return { name: 'os-' + (fm.name || f.replace(/\.md$/, '')), description: fm.description || '', hint: fm.argument_hint || '', body: body(text) };
});
const roles = fs.readdirSync(path.join(OS, 'roles')).filter(f => f.endsWith('.md')).sort().map(f => {
  const text = fs.readFileSync(path.join(OS, 'roles', f), 'utf8');
  const fm = frontmatter(text) || {};
  return { role: fm.role || f.replace(/\.md$/, ''), title: fm.title || '', description: fm.description || '', body: body(text), text };
});

const fill = (text, agent, args) => text.replaceAll('{{AGENT}}', agent).replaceAll('{{ARGS}}', args);

// ---------- Claude Code ----------
put('CLAUDE.md', `<!-- ${GEN} -->
# CLAUDE.md

@AGENTS.md

## Claude Code w Agent OS

- Jesteś agentem **claude**. W komendach Agent OS podawaj \`--agent claude\`.
- Komendy: ${workflows.map(w => '`/' + w.name + '`').join(', ')}.
- Hooki (\`.claude/settings.json\`) blokują zapis poza zakresem zadania, komendy z listy zakazanej i sprawdzają bramki przed zakończeniem tury. Blokada to informacja, nie przeszkoda do obejścia: zatrzymaj się i wyjaśnij użytkownikowi.
- Recenzję Twojej pracy robi Gemini (i odwrotnie). Nie recenzuj własnych zadań, także przez subagentów.
- Pliki ról: ${roles.map(r => '`.agent-os/roles/' + r.role + '.md`').join(', ')}.
`);

for (const w of workflows) {
  put(`.claude/commands/${w.name}.md`, `---
description: ${JSON.stringify(w.description)}
${w.hint ? `argument-hint: ${JSON.stringify(w.hint)}\n` : ''}---
<!-- ${GEN} -->
${fill(w.body, 'claude', '$ARGUMENTS')}
`);
}

const hook = (script, agent, envVar) => `node "$${envVar}/.agent-os/scripts/hooks/${script}"${agent ? ' --agent ' + agent : ''}`;
put('.claude/settings.json', JSON.stringify({
  $schema: 'https://json.schemastore.org/claude-code-settings.json',
  permissions: {
    allow: [
      'Bash(node .agent-os/scripts/gate.mjs:*)',
      'Bash(node .agent-os/scripts/task.mjs:*)',
      'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git branch:*)',
      'Bash(npx tsc --noEmit:*)', 'Bash(npx eslint:*)', 'Bash(npx jest:*)', 'Bash(deno test:*)',
    ],
    deny: [
      'Read(./.env)', 'Read(./.env.local)', 'Read(./.env.development)', 'Read(./.env.production)', 'Read(./.env.*.local)',
      'Bash(git push --force:*)', 'Bash(git push -f:*)', 'Bash(supabase db push:*)', 'Bash(supabase secrets set:*)',
      'Bash(eas submit:*)',
    ],
  },
  hooks: {
    SessionStart: [{ hooks: [{ type: 'command', command: hook('session-start.mjs', 'claude', 'CLAUDE_PROJECT_DIR') }] }],
    PreToolUse: [{ matcher: 'Edit|Write|MultiEdit|NotebookEdit|Bash', hooks: [{ type: 'command', command: hook('pretool.mjs', 'claude', 'CLAUDE_PROJECT_DIR') }] }],
    Stop: [{ hooks: [{ type: 'command', command: hook('stop.mjs', null, 'CLAUDE_PROJECT_DIR') }] }],
  },
}, null, 2));

// ---------- Gemini (CLI + Antigravity) ----------
const geminiNotes = `
## Gemini w Agent OS

- Jesteś agentem **gemini**. W komendach Agent OS podawaj \`--agent gemini\`.
- Workflowy / komendy: ${workflows.map(w => '`/' + w.name + '`').join(', ')} (Antigravity: \`.agents/workflows/\`, Gemini CLI: \`.gemini/commands/\`).
- Antigravity nie ma hooków blokujących narzędzia: **uruchamiaj \`node .agent-os/scripts/gate.mjs\` po każdym kroku**. Hooki git i CI i tak zablokują naruszenia, tylko później.
- W Antigravity wyłącz tryb „Turbo” / automatyczne wykonywanie komend dla git push i supabase. Agent nie wykonuje czynności człowieka.
- Recenzję Twojej pracy robi Claude (i odwrotnie). Nie recenzuj własnych zadań.
- Pliki ról: ${roles.map(r => '`.agent-os/roles/' + r.role + '.md`').join(', ')}.
`;
put('GEMINI.md', `<!-- ${GEN} (treść = AGENTS.md + uwagi dla Gemini) -->\n${agentsMd.trim()}\n${geminiNotes}`);

put('.gemini/settings.json', JSON.stringify({
  context: { fileName: ['GEMINI.md'] },
  hooks: {
    SessionStart: [{ hooks: [{ name: 'agent-os-status', type: 'command', command: hook('session-start.mjs', 'gemini', 'GEMINI_PROJECT_DIR'), timeout: 15000 }] }],
    BeforeTool: [{
      matcher: 'write_file|replace|edit|run_shell_command',
      hooks: [{ name: 'agent-os-scope', type: 'command', command: hook('pretool.mjs', 'gemini', 'GEMINI_PROJECT_DIR'), timeout: 15000, description: 'Agent OS: zakres zapisu i komendy zakazane' }],
    }],
  },
}, null, 2));

const toml = (s) => { if (s.includes("'''")) throw new Error("''' w treści workflow"); return `'''\n${s}\n'''`; };
for (const w of workflows) {
  put(`.gemini/commands/${w.name}.toml`, `# ${GEN}
description = ${JSON.stringify(w.description)}
prompt = ${toml(fill(w.body, 'gemini', '{{args}}'))}
`);
}

// Antigravity: reguły i workflowy
const rule00 = `---
trigger: always_on
---
<!-- ${GEN} -->
${agentsMd.trim()}
${geminiNotes}`;
put('.agents/rules/00-agent-os.md', rule00);
for (const r of roles) {
  put(`.agents/rules/10-role-${r.role}.md`, `---
trigger: model_decision
description: ${JSON.stringify(`Rola Agent OS "${r.role}" (${r.title}): ${r.description} Stosuj, gdy bieżące zadanie ma role: ${r.role}.`)}
---
<!-- ${GEN} -->
${r.body}

Uprawnienia zapisu roli (contracts/roles.yaml): ${(cfg.roles.roles[r.role]?.write || []).map(g => '`' + g + '`').join(', ')}
`);
}
for (const w of workflows) {
  put(`.agents/workflows/${w.name}.md`, `---
description: ${JSON.stringify(w.description)}
---
<!-- ${GEN} -->
${fill(w.body, 'gemini', `argument podany po /${w.name}${w.hint ? ' (' + w.hint + ')' : ''}`)}
`);
}

// ---------- zapis / sprawdzenie ----------
let stale = 0;
for (const [rel, content] of outputs) {
  if (rel.startsWith('.agents/rules/') && content.length > ANTIGRAVITY_RULE_LIMIT) {
    console.error(`✖ ${rel}: ${content.length} znaków > limit reguły Antigravity ${ANTIGRAVITY_RULE_LIMIT}`);
    process.exitCode = 1;
  }
  const abs = path.join(root, rel);
  const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (current === content) continue;
  stale++;
  if (check) { console.error(`✖ nieaktualne: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  console.log(`✔ ${rel}`);
}
// usuń osierocone pliki os-* po usuniętych workflowach
for (const [dir, ext] of [['.claude/commands', '.md'], ['.gemini/commands', '.toml'], ['.agents/workflows', '.md']]) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    const rel = `${dir}/${f}`;
    if (f.startsWith('os-') && f.endsWith(ext) && !outputs.has(rel)) {
      stale++;
      if (check) console.error(`✖ osierocony: ${rel}`);
      else { fs.unlinkSync(abs + '/' + f); console.log(`✖ usunięto ${rel}`); }
    }
  }
}
if (check && stale) { console.error('Uruchom: node .agent-os/scripts/sync-adapters.mjs'); process.exit(1); }
if (!check) console.log(stale ? `Zaktualizowano ${stale} plik(ów).` : 'Adaptery aktualne.');
