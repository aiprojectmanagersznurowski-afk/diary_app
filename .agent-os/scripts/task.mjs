#!/usr/bin/env node
// Agent OS: zadania i przekazywanie pracy między agentami (Claude <-> Gemini).
//
//   node .agent-os/scripts/task.mjs list
//   node .agent-os/scripts/task.mjs next [--role mobile]
//   node .agent-os/scripts/task.mjs show F1-02
//   node .agent-os/scripts/task.mjs start F1-02 --agent claude|gemini
//   node .agent-os/scripts/task.mjs status [--brief]
//   node .agent-os/scripts/task.mjs handoff --agent claude|gemini     (dopisuje wpis sesji)

import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, loadTasks, roadmapState, taskIdFromBranch, osPaths, AGENTS } from './lib/context.mjs';
import { git, repoRoot, currentBranch, refExists } from './lib/git.mjs';
import { frontmatter } from './lib/util.mjs';

const root = repoRoot();
const cfg = loadConfig(root);
const P = osPaths(root);
const { tasks, errors } = loadTasks(root);
const [cmd = 'status', ...rest] = process.argv.slice(2);
const arg = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--')));
const today = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

function fail(msg) { console.error('✖ ' + msg); process.exit(1); }

function baseRef() { return (cfg.gates.base_refs || ['main']).find(r => refExists(root, r)); }

function roadmapOnBase() {
  const ref = baseRef();
  const text = ref ? git(root, ['show', `${ref}:${cfg.gates.roadmap.file}`], { allowFail: true }) : null;
  return roadmapState(text ?? (fs.existsSync(path.join(root, cfg.gates.roadmap.file)) ? fs.readFileSync(path.join(root, cfg.gates.roadmap.file), 'utf8') : ''));
}

function isDone(t, rm) { return rm.get(t.roadmap) === true; }

function blockers(t, rm) {
  return (t.depends_on || []).filter(d => !tasks.has(d) || !isDone(tasks.get(d), rm));
}

function handoffPath(id) { return path.join(P.handoff, `${id}.md`); }

function readHandoff(id) {
  const p = handoffPath(id);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function section(text, name) {
  const m = new RegExp(`^## ${name}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'm').exec(text || '');
  return m ? m[1].replace(/<!--[\s\S]*?-->/g, '').trim() : '';
}

function printTask(t) {
  console.log(`\n${t.id} · ${t.title}`);
  console.log(`rola: ${t.role} · faza ${t.phase} · gałąź: ${t.branch}`);
  if (t.depends_on?.length) console.log(`zależy od: ${t.depends_on.join(', ')}`);
  console.log(`\nroadmapa: - [ ] ${t.roadmap}`);
  if (t.read_first?.length) console.log(`\nprzeczytaj najpierw:\n${t.read_first.map(r => '  - ' + r).join('\n')}`);
  console.log(`\nzakres zapisu (scope.write):\n${t.scope.write.map(r => '  - ' + r).join('\n')}`);
  if (t.scope.delete?.length) console.log(`wolno usunąć (scope.delete):\n${t.scope.delete.map(r => '  - ' + r).join('\n')}`);
  if (t.context) console.log(`\nkontekst:\n${String(t.context).trim().split('\n').map(l => '  ' + l).join('\n')}`);
  console.log(`\nkryteria akceptacji:\n${t.acceptance.map(r => '  - [ ] ' + r).join('\n')}`);
  if (t.fixes_known_bugs?.length) console.log(`\nznane błędy do naprawy w tym zadaniu:\n${t.fixes_known_bugs.map(r => '  - ' + r).join('\n')}`);
  if (t.human_steps?.length) console.log(`\nkroki człowieka (agent ich NIE wykonuje, tylko przypomina):\n${t.human_steps.map(r => '  - ' + r).join('\n')}`);
  if (t.out_of_scope?.length) console.log(`\npoza zakresem:\n${t.out_of_scope.map(r => '  - ' + r).join('\n')}`);
}

function renderTemplate(name, vars) {
  let t = fs.readFileSync(path.join(P.templates, name), 'utf8');
  for (const [k, v] of Object.entries(vars)) t = t.replaceAll(`{{${k}}}`, v);
  return t;
}

function appendSession(id, agent, note) {
  const p = handoffPath(id);
  let text = fs.readFileSync(p, 'utf8');
  const line = `- ${today()} ${agent}: ${note}`;
  text = /\n## Sesje\s*\n/.test(text) ? text.replace(/(\n## Sesje\s*\n(?:<!--[\s\S]*?-->\n)?)/, `$1${line}\n`) : text + `\n## Sesje\n${line}\n`;
  text = text.replace(/^updated:.*$/m, `updated: ${today()}`);
  fs.writeFileSync(p, text);
}

switch (cmd) {
  case 'list': {
    const rm = roadmapOnBase();
    for (const t of tasks.values()) {
      const done = isDone(t, rm), bl = blockers(t, rm);
      const hf = frontmatter(readHandoff(t.id));
      const st = done ? '✔ gotowe ' : hf ? `… ${hf.status.padEnd(7)}` : bl.length ? '⏸ czeka  ' : '○ wolne  ';
      console.log(`${st} ${t.id.padEnd(6)} ${t.role.padEnd(7)} ${t.title}${bl.length && !done ? `  (czeka na: ${bl.join(', ')})` : ''}${hf ? `  [${hf.implementer}]` : ''}`);
    }
    for (const e of errors) console.log(`✖ ${e.file}: ${e.msg}`);
    break;
  }
  case 'next': {
    const rm = roadmapOnBase();
    const role = arg('--role');
    const t = [...tasks.values()].find(t => !isDone(t, rm) && !blockers(t, rm).length && !readHandoff(t.id) && (!role || t.role === role));
    if (!t) { console.log('Brak wolnych zadań z zamkniętymi zależnościami. Sprawdź "list" albo zaplanuj kolejną fazę (/plan).'); break; }
    printTask(t);
    console.log(`\nstart: node .agent-os/scripts/task.mjs start ${t.id} --agent <claude|gemini>`);
    break;
  }
  case 'show': {
    const t = tasks.get(positional[0]) || fail(`nie ma zadania ${positional[0]}`);
    printTask(t);
    const h = readHandoff(t.id);
    if (h) console.log(`\n--- handoff ---\n${h}`);
    break;
  }
  case 'start': {
    const id = positional[0];
    const agent = arg('--agent');
    if (!AGENTS.includes(agent)) fail(`podaj --agent ${AGENTS.join('|')}`);
    const t = tasks.get(id) || fail(`nie ma kontraktu .agent-os/tasks/${id}.yaml`);
    const rm = roadmapOnBase();
    if (isDone(t, rm)) fail(`${id} jest już odhaczone w roadmapie na ${baseRef()}`);
    const bl = blockers(t, rm);
    if (bl.length) fail(`${id} czeka na: ${bl.join(', ')} (nieodhaczone w roadmapie na ${baseRef()})`);
    const branch = currentBranch(root);
    if (branch !== t.branch) {
      const dirty = git(root, ['status', '--porcelain']);
      if (dirty) fail(`masz niezacommitowane zmiany na '${branch}'. Zacommituj je albo zapisz handoff przed zmianą zadania.`);
      if (refExists(root, t.branch)) git(root, ['switch', t.branch]);
      else if (refExists(root, `origin/${t.branch}`)) git(root, ['switch', '-c', t.branch, '--track', `origin/${t.branch}`]);
      else git(root, ['switch', '-c', t.branch, baseRef() || 'HEAD']);
    }
    fs.mkdirSync(P.handoff, { recursive: true });
    const h = readHandoff(id);
    if (!h) {
      fs.writeFileSync(handoffPath(id), renderTemplate('handoff.md', {
        TASK: id, TITLE: t.title, AGENT: agent, BRANCH: t.branch, DATE: today(),
      }));
      console.log(`✔ gałąź ${t.branch}, utworzono .agent-os/handoff/${id}.md (implementer: ${agent})`);
    } else {
      const fm = frontmatter(h) || {};
      appendSession(id, agent, fm.implementer === agent ? 'wznowienie' : `przejęcie pracy (implementer: ${fm.implementer})`);
      console.log(`✔ gałąź ${t.branch}; wznowienie. Poprzedni stan:\n`);
      console.log(`Stan:\n${section(h, 'Stan') || '(pusto)'}\n\nNastępny krok:\n${section(h, 'Następny krok') || '(pusto)'}`);
      const wait = section(h, 'Czeka na człowieka');
      if (wait && wait !== '-') console.log(`\n⚠ Czeka na człowieka:\n${wait}`);
    }
    printTask(t);
    console.log('\nPracuj wyłącznie w zakresie powyżej. Sprawdzaj często: node .agent-os/scripts/gate.mjs');
    break;
  }
  case 'handoff': {
    const agent = arg('--agent');
    if (!AGENTS.includes(agent)) fail(`podaj --agent ${AGENTS.join('|')}`);
    const id = taskIdFromBranch(currentBranch(root), cfg.gates) || fail('bieżąca gałąź nie ma zadania');
    if (!readHandoff(id)) fail(`brak .agent-os/handoff/${id}.md; zacznij od "start"`);
    appendSession(id, agent, positional.join(' ') || 'koniec sesji');
    console.log(`✔ dopisano sesję do .agent-os/handoff/${id}.md. Uzupełnij sekcje: Stan, Następny krok, Checkpointy, Czeka na człowieka.`);
    break;
  }
  case 'status': {
    const branch = currentBranch(root);
    const id = taskIdFromBranch(branch, cfg.gates);
    const t = id && tasks.get(id);
    const brief = rest.includes('--brief');
    console.log(`[Agent OS] gałąź: ${branch} · zadanie: ${id || '—'}${t ? ` (${t.title}) · rola: ${t.role}` : ` · rola: ${cfg.roles.default_role}`}`);
    if (cfg.gates.branch.protected.includes(branch)) {
      console.log('[Agent OS] Jesteś na gałęzi chronionej. Wybierz zadanie: node .agent-os/scripts/task.mjs next, potem start <ID> --agent <claude|gemini>.');
    }
    const h = id && readHandoff(id);
    if (h) {
      const fm = frontmatter(h) || {};
      console.log(`[Agent OS] handoff: implementer=${fm.implementer} status=${fm.status} updated=${fm.updated}`);
      const next = section(h, 'Następny krok');
      if (next) console.log(`[Agent OS] następny krok:\n${next}`);
      const wait = section(h, 'Czeka na człowieka');
      if (wait && wait !== '-') console.log(`[Agent OS] czeka na człowieka:\n${wait}`);
    }
    if (!brief && t) printTask(t);
    break;
  }
  default:
    fail(`nieznana komenda ${cmd}`);
}
