#!/usr/bin/env node
// Stop (Claude Code): zanim Claude zakończy turę, uruchamia szybkie bramki na gałęzi.
// Przy błędach blokuje zakończenie raz (exit 2) i podaje wynik; drugi raz przepuszcza,
// żeby nie wpaść w pętlę (stop_hook_active).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
if (input.stop_hook_active) process.exit(0);

const here = path.dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [path.join(here, '..', 'gate.mjs'), '--worktree'], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
if (r.status === 0) process.exit(0);
const out = ((r.stdout || '') + (r.stderr || '')).split('\n').filter(l => l.startsWith('✖') || l.startsWith('Agent OS')).slice(0, 30).join('\n');
if (/praca bezpośrednio na/.test(out) && !/plików: [1-9]/.test(out)) process.exit(0); // na main bez zmian: nic do zgłoszenia
process.stderr.write(`[Agent OS] Bramki nie przechodzą. Popraw albo zapisz stan w handoff (/os-handoff) i wyjaśnij użytkownikowi:\n${out}\n`);
process.exit(2);
