#!/usr/bin/env node
// Samotest Agent OS: buduje tymczasowe repo w kształcie Vocaly, wprowadza znane naruszenia
// i sprawdza, że bramki je łapią (a poprawne zmiany przepuszczają).
//
//   node .agent-os/selftest/run.mjs            przypadki testowe
//   node .agent-os/selftest/run.mjs --mutate   + testy mutacyjne: każda bramka wyłączona po kolei
//                                              musi zostać „zabita” przez co najmniej jeden przypadek
//   node .agent-os/selftest/run.mjs --keep     nie usuwaj repo testowego
//   node .agent-os/selftest/run.mjs --only nazwa

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CASES, FIXTURE, UNIT } from './cases.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OS_DIR = path.resolve(here, '..');
const KIT_ROOT = path.resolve(OS_DIR, '..');
const args = process.argv.slice(2);
const MUTATE = args.includes('--mutate');
const KEEP = args.includes('--keep');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-os-selftest-'));
const repo = fs.realpathSync(tmp);
const gitc = (a, opts = {}) => execFileSync('git', a, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });

function write(rel, content) {
  const abs = path.join(repo, rel);
  if (content === null) { fs.rmSync(abs, { force: true }); return; }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, typeof content === 'function' ? content(fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '') : content);
}

function setupFixture() {
  fs.cpSync(OS_DIR, path.join(repo, '.agent-os'), { recursive: true, filter: (s) => !s.includes(`${path.sep}handoff${path.sep}`) && !s.includes(`${path.sep}reviews${path.sep}`) });
  fs.copyFileSync(path.join(KIT_ROOT, 'AGENTS.md'), path.join(repo, 'AGENTS.md'));
  for (const [rel, content] of Object.entries(FIXTURE(repo))) write(rel, content);
  gitc(['init', '-q', '-b', 'main']);
  gitc(['config', 'user.email', 'selftest@agent-os.local']);
  gitc(['config', 'user.name', 'Agent OS selftest']);
  gitc(['config', 'commit.gpgsign', 'false']);
  gitc(['config', 'core.hooksPath', '/dev/null']);
  gitc(['add', '-A']);
  gitc(['commit', '-q', '-m', 'chore: fixture']);
}

function reset() {
  gitc(['checkout', '-q', '-f', 'main']);
  gitc(['clean', '-fdq']);
  const branches = gitc(['branch', '--format=%(refname:short)']).split('\n').filter(b => b && b !== 'main');
  if (branches.length) gitc(['branch', '-q', '-D', ...branches]);
}

function runGate(extraArgs, env) {
  const r = spawnSync(process.execPath, [path.join(repo, '.agent-os/scripts/gate.mjs'), ...extraArgs, '--json'], {
    cwd: repo, encoding: 'utf8', env: { ...process.env, CI: '', GITHUB_HEAD_REF: '', GITHUB_EVENT_PATH: '', AGENT_OS_HUMAN: '', ...env },
  });
  try { return JSON.parse(r.stdout); } catch { return { ok: false, crash: (r.stdout || '') + (r.stderr || ''), errors: [], checkpoints: [] }; }
}

function runCase(c, disabled) {
  reset();
  if (c.branch && c.branch !== 'main') gitc(['checkout', '-q', '-b', c.branch]);
  for (const step of c.commits || []) {
    for (const [rel, content] of Object.entries(step.files)) write(rel, content);
    gitc(['add', '-A']);
    gitc(['commit', '-q', '--allow-empty', '-m', step.msg || 'feat: selftest change']);
  }
  for (const [rel, content] of Object.entries(c.files || {})) write(rel, content);
  if (c.kind === 'hook') {
    const r = spawnSync(process.execPath, [path.join(repo, '.agent-os/scripts/hooks/pretool.mjs'), '--agent', c.agent], {
      cwd: repo, input: JSON.stringify({ cwd: repo, tool_name: c.tool, tool_input: c.input }), encoding: 'utf8',
      env: { ...process.env, AGENT_OS_HUMAN: '', ...c.env },
    });
    const got = r.status;
    return { pass: got === c.expectExit, detail: `exit ${got}, oczekiwano ${c.expectExit} ${r.stderr.trim()}` };
  }
  if (c.kind === 'msg') {
    const f = path.join(repo, '.git', 'SELFTEST_MSG');
    fs.writeFileSync(f, c.message + '\n');
    const r = spawnSync(process.execPath, [path.join(repo, '.agent-os/scripts/gate.mjs'), '--commit-msg', f], { cwd: repo, encoding: 'utf8' });
    const ok = r.status === 0;
    return { pass: ok === (c.expect === 'pass'), detail: r.stderr.trim() };
  }
  if (c.mode !== 'worktree') gitc(['add', '-A']);
  if (c.mode === 'base') gitc(['commit', '-q', '--allow-empty', '-m', c.msg || 'feat: selftest change']);
  const env = { ...(c.env || {}), AGENT_OS_SELFTEST_ROOT: repo, AGENT_OS_DISABLE_GATE: disabled || '' };
  const res = runGate([`--${c.mode || 'staged'}`, ...(c.args || [])], env);
  if (res.crash) return { pass: false, detail: 'awaria: ' + res.crash.slice(0, 800) };
  const errGates = new Set(res.errors.map(e => e.gate));
  const cps = new Set((res.checkpoints || []).map(x => x.id));
  let pass;
  if (c.expect === 'pass') pass = res.ok;
  else pass = errGates.has(c.expect);
  if (pass && c.expectCheckpoint) pass = cps.has(c.expectCheckpoint);
  const detail = `ok=${res.ok} błędy: ${res.errors.map(e => `[${e.gate}] ${e.file || ''} ${e.msg}`).join(' | ') || '—'}${cps.size ? ' · CP: ' + [...cps].join(',') : ''}`;
  return { pass, detail };
}

// ---- przebieg ----
let failed = 0;
for (const u of UNIT) {
  try { u.run(); console.log(`✔ unit  ${u.name}`); }
  catch (e) { failed++; console.log(`✖ unit  ${u.name}: ${e.message}`); }
}

setupFixture();
const cases = CASES.filter(c => !ONLY || c.name.includes(ONLY));
for (const c of cases) {
  const r = runCase(c);
  if (r.pass) console.log(`✔ ${c.name}`);
  else { failed++; console.log(`✖ ${c.name}\n    ${r.detail}`); }
}

if (MUTATE && !failed) {
  const { GATES } = await import(path.join(repo, '.agent-os/scripts/gates/index.mjs'));
  const gateCases = cases.filter(c => !c.kind);
  const survivors = [];
  for (const id of Object.keys(GATES)) {
    let killedBy = null;
    for (const c of gateCases) {
      if (!runCase(c, id).pass) { killedBy = c.name; break; }
    }
    if (killedBy) console.log(`✔ mutant "${id} wyłączona" zabity przez: ${killedBy}`);
    else { survivors.push(id); console.log(`✖ mutant "${id} wyłączona" przeżył: żaden przypadek nie zauważył braku bramki`); }
  }
  failed += survivors.length;
}

if (!KEEP) fs.rmSync(tmp, { recursive: true, force: true });
else console.log(`repo testowe: ${repo}`);
console.log(failed ? `\n✖ ${failed} niepowodzeń` : `\n✔ selftest OK (${UNIT.length} unit, ${cases.length} przypadków${MUTATE ? ', mutacje zabite' : ''})`);
process.exit(failed ? 1 : 0);
