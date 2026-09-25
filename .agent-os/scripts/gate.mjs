#!/usr/bin/env node
// Agent OS: bramki jakości Vocaly. Uruchamiają je ludzie, Claude, Gemini, hooki git i CI.
//
//   node .agent-os/scripts/gate.mjs                 gałąź + niezacommitowane zmiany (domyślnie)
//   node .agent-os/scripts/gate.mjs --staged        pre-commit
//   node .agent-os/scripts/gate.mjs --base [ref]    pre-push / CI
//   node .agent-os/scripts/gate.mjs --finish        + definicja ukończenia (roadmapa, handoff, testy, tsc, lint...)
//   node .agent-os/scripts/gate.mjs --pr            + recenzja krzyżowa i commity (CI)
//   node .agent-os/scripts/gate.mjs --commit-msg <plik>
//   opcje: --only a,b  --task F1-02  --no-dod  --json

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildContext, loadConfig } from './lib/context.mjs';
import { repoRoot } from './lib/git.mjs';
import { GATES } from './gates/index.mjs';
import { checkSubject } from './gates/commits.mjs';

function parseArgs(argv) {
  const o = { mode: 'worktree', finish: false, pr: false, dod: true, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--staged') o.mode = 'staged';
    else if (a === '--worktree') o.mode = 'worktree';
    else if (a === '--base') { o.mode = 'base'; if (argv[i + 1] && !argv[i + 1].startsWith('--')) o.base = argv[++i]; }
    else if (a === '--finish') o.finish = true;
    else if (a === '--pr') { o.pr = true; o.finish = true; }
    else if (a === '--no-dod') o.dod = false;
    else if (a === '--json') o.json = true;
    else if (a === '--only') o.only = argv[++i].split(',');
    else if (a === '--task') o.task = argv[++i];
    else if (a === '--commit-msg') o.commitMsg = argv[++i];
    else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 12).join('\n')); process.exit(0); }
    else { console.error(`nieznana opcja ${a}`); process.exit(2); }
  }
  return o;
}

const C = process.stdout.isTTY && !process.env.NO_COLOR
  ? { r: s => `\x1b[31m${s}\x1b[0m`, y: s => `\x1b[33m${s}\x1b[0m`, g: s => `\x1b[32m${s}\x1b[0m`, c: s => `\x1b[36m${s}\x1b[0m`, d: s => `\x1b[2m${s}\x1b[0m` }
  : { r: s => s, y: s => s, g: s => s, c: s => s, d: s => s };

function commitMsgMode(file) {
  const root = repoRoot();
  const { gates } = loadConfig(root);
  const subject = (fs.readFileSync(file, 'utf8').split('\n').find(l => l.trim() && !l.startsWith('#')) || '').trim();
  const msg = checkSubject(subject, gates.commit_msg);
  if (msg) { console.error(C.r(`✖ [commit-msg] "${subject}": ${msg}`)); process.exit(1); }
  process.exit(0);
}

function sh(cmd, root, timeoutMs = 20 * 60 * 1000) {
  const r = spawnSync(cmd, { cwd: root, shell: true, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024 });
  return { code: r.status ?? 1, out: (r.stdout || '') + (r.stderr || '') };
}

function hasPackage(root, name) {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return !!((p.dependencies || {})[name] || (p.devDependencies || {})[name]);
  } catch { return false; }
}

function runDod(ctx) {
  const out = [];
  for (const d of ctx.cfg.dod || []) {
    if (d.when_file && !fs.existsSync(path.join(ctx.root, d.when_file))) { out.push({ id: d.id, level: 'skip', msg: `brak ${d.when_file}` }); continue; }
    if (d.when_package && !hasPackage(ctx.root, d.when_package)) { out.push({ id: d.id, level: 'skip', msg: `pakiet ${d.when_package} nie jest zainstalowany` }); continue; }
    const missingTool = d.tool && sh(`command -v ${d.tool}`, ctx.root).code !== 0;
    const probeFail = !missingTool && d.probe && sh(d.probe, ctx.root, 60000).code !== 0;
    if (missingTool || probeFail) {
      const msg = missingTool ? `brak narzędzia ${d.tool}` : `"${d.probe}" nie działa (uruchom lokalny stos)`;
      out.push({ id: d.id, level: ctx.isCI ? 'error' : 'warn', msg });
      continue;
    }
    const r = sh(d.run, ctx.root);
    if (d.error_budget != null) {
      const n = (r.out.match(new RegExp(d.count_regex, 'g')) || []).length;
      if (n > d.error_budget) out.push({ id: d.id, level: 'error', msg: `${n} błędów > budżet ${d.error_budget}`, tail: r.out });
      else out.push({ id: d.id, level: 'ok', msg: `${n} błędów (budżet ${d.error_budget})` });
    } else if (r.code !== 0) out.push({ id: d.id, level: 'error', msg: `"${d.run}" zakończone kodem ${r.code}`, tail: r.out });
    else out.push({ id: d.id, level: 'ok', msg: 'OK' });
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.commitMsg) return commitMsgMode(opts.commitMsg);

  const ctx = buildContext(opts);
  const disabled = ctx.selftest ? (process.env.AGENT_OS_DISABLE_GATE || '').split(',').filter(Boolean) : [];
  let ids = opts.only || [
    ...ctx.cfg.fast,
    ...(opts.finish ? ctx.cfg.finish : []),
    ...(opts.pr ? ctx.cfg.pr : []),
  ];
  ids = ids.filter(id => !disabled.includes(id));

  const results = [];
  const checkpoints = [];
  const deferred = ids.includes('handoff');
  for (const id of ids) {
    const g = GATES[id];
    if (!g) { results.push({ gate: id, level: 'error', msg: `nieznana bramka ${id}` }); continue; }
    if (id === 'handoff' && deferred) continue;
    let res;
    try { res = g.run(ctx); } catch (e) { res = [{ level: 'error', msg: `wyjątek w bramce: ${e.message}` }]; }
    for (const r of res) {
      if (r.level === 'checkpoint') checkpoints.push(r);
      else results.push({ gate: id, ...r });
    }
  }
  if (deferred) for (const r of GATES.handoff.run(ctx, { checkpoints })) results.push({ gate: 'handoff', ...r });

  const dod = opts.finish && opts.dod ? runDod(ctx) : [];
  for (const d of dod) if (d.level === 'error' || d.level === 'warn') results.push({ gate: `dod:${d.id}`, level: d.level, msg: d.msg, tail: d.tail });

  const errors = results.filter(r => r.level === 'error');
  const summary = {
    ok: errors.length === 0, branch: ctx.branch, task: ctx.taskId, role: ctx.roleName, mode: ctx.mode,
    files: ctx.files.length, errors, warnings: results.filter(r => r.level === 'warn'),
    checkpoints: [...new Map(checkpoints.map(c => [c.id, c])).values()], dod,
  };
  if (opts.json) { console.log(JSON.stringify(summary, null, 2)); process.exit(summary.ok ? 0 : 1); }

  console.log(C.c(`Agent OS gate · gałąź ${ctx.branch} · zadanie ${ctx.taskId || '—'} · rola ${ctx.roleName} · tryb ${ctx.mode}${opts.finish ? '+finish' : ''}${opts.pr ? '+pr' : ''} · plików: ${ctx.files.length}`));
  if (disabled.length) console.log(C.y(`(selftest) wyłączone bramki: ${disabled.join(', ')}`));
  for (const r of results) {
    const loc = r.file ? `${r.file}${r.line ? ':' + r.line : ''}: ` : '';
    const line = `[${r.gate}] ${loc}${r.msg}`;
    console.log(r.level === 'error' ? C.r('✖ ' + line) : C.y('⚠ ' + line));
    if (r.tail) console.log(C.d(r.tail.split('\n').slice(-200).join('\n')));
  }
  for (const d of dod) if (d.level === 'ok' || d.level === 'skip') console.log(C.d(`· [dod:${d.id}] ${d.level === 'ok' ? d.msg : 'pominięte: ' + d.msg}`));
  if (summary.checkpoints.length) {
    console.log(C.c('\nCheckpointy człowieka (wpisz je w handoff, sekcja "## Checkpointy"):'));
    for (const c of summary.checkpoints) console.log(C.c(`  ${c.id}  ${c.msg}`));
  }
  console.log(errors.length ? C.r(`\n✖ ${errors.length} błąd(ów). Popraw i uruchom ponownie.`) : C.g('\n✔ bramki przeszły'));
  process.exit(errors.length ? 1 : 0);
}

main();
