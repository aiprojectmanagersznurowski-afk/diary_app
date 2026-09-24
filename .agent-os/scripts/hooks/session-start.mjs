#!/usr/bin/env node
// SessionStart (Claude Code i Gemini CLI): wypisuje stan zadania i handoff do kontekstu agenta.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [path.join(here, '..', 'task.mjs'), 'status', '--brief'], { encoding: 'utf8' });
const text = (r.stdout || '') + (r.stderr || '');
const agent = process.argv.includes('--agent') ? process.argv[process.argv.indexOf('--agent') + 1] : 'agent';
const msg = `${text.trim()}\n[Agent OS] Jesteś: ${agent}. Protokół sesji: AGENTS.md → sekcja "Protokół sesji". Na koniec sesji: workflow /os-handoff.`;

if (agent === 'gemini') {
  // Gemini CLI: kontekst dodatkowy przez hookSpecificOutput
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: msg } }));
} else {
  process.stdout.write(msg + '\n');
}
process.exit(0);
