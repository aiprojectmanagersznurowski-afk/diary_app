import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import YAML from './yaml.mjs';
import { git, repoRoot, currentBranch, refExists, parseNameStatus, parseUnified } from './git.mjs';

export const AGENTS = ['claude', 'gemini'];

export function loadYaml(file) {
  return YAML.parse(fs.readFileSync(file, 'utf8'));
}

export function osPaths(root) {
  const dir = path.join(root, '.agent-os');
  return {
    dir,
    contracts: path.join(dir, 'contracts'),
    tasks: path.join(dir, 'tasks'),
    handoff: path.join(dir, 'handoff'),
    reviews: path.join(dir, 'reviews'),
    templates: path.join(dir, 'templates'),
  };
}

export function loadConfig(root) {
  const p = osPaths(root);
  return {
    gates: loadYaml(path.join(p.contracts, 'gates.yaml')),
    roles: loadYaml(path.join(p.contracts, 'roles.yaml')),
    checkpoints: loadYaml(path.join(p.contracts, 'checkpoints.yaml')),
  };
}

/** Wczytuje kontrakty zadań. Zwraca { tasks: Map, errors: [] } */
export function loadTasks(root, reader) {
  const dir = osPaths(root).tasks;
  const tasks = new Map();
  const errors = [];
  const names = reader
    ? reader.list('.agent-os/tasks').filter(n => n.endsWith('.yaml'))
    : (fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => n.endsWith('.yaml')) : []);
  for (const name of names.sort()) {
    const rel = `.agent-os/tasks/${name}`;
    try {
      const text = reader ? reader.read(rel) : fs.readFileSync(path.join(dir, name), 'utf8');
      if (text == null) continue;
      const t = YAML.parse(text);
      t.__file = rel;
      if (t && t.id) tasks.set(t.id, t);
      else errors.push({ file: rel, msg: 'brak pola id' });
    } catch (e) {
      errors.push({ file: rel, msg: 'niepoprawny YAML: ' + e.message.split('\n')[0] });
    }
  }
  return { tasks, errors };
}

export function taskIdFromBranch(branch, cfg) {
  const m = new RegExp('(?:^|/)(' + cfg.branch.task_id + ')(?:-|$)').exec(branch || '');
  return m ? m[1] : null;
}

/** Status zadań według roadmapy: Map<tekst, boolean(checked)> */
export function roadmapState(text) {
  const map = new Map();
  if (!text) return map;
  for (const line of text.split('\n')) {
    const m = /^\s*- \[( |x|X)\] (.+?)\s*$/.exec(line);
    if (m) map.set(m[2], m[1] !== ' ');
  }
  return map;
}

export function isSelftestOverride(root) {
  const r = process.env.AGENT_OS_SELFTEST_ROOT;
  if (!r || process.env.CI) return false;
  const real = fs.realpathSync(root), tmp = fs.realpathSync(os.tmpdir());
  return fs.realpathSync(r) === real && real.startsWith(tmp + path.sep);
}

export function isHuman(root) {
  if (process.env.CI) {
    // W CI człowiek potwierdza etykietą PR
    const ev = process.env.GITHUB_EVENT_PATH;
    if (!ev || !fs.existsSync(ev)) return false;
    try {
      const data = JSON.parse(fs.readFileSync(ev, 'utf8'));
      return (data.pull_request?.labels || []).some(l => l.name === 'agent-os:human-approved');
    } catch { return false; }
  }
  return process.env.AGENT_OS_HUMAN === '1';
}

/**
 * Buduje kontekst dla bramek.
 * mode: 'staged' | 'worktree' | 'base'
 */
export function buildContext({ mode = 'worktree', base, task: taskOverride, cwd } = {}) {
  const root = repoRoot(cwd);
  const cfg = loadConfig(root);
  const branch = currentBranch(root);

  let baseRef = base;
  if (!baseRef) baseRef = (cfg.gates.base_refs || ['main']).find(r => refExists(root, r)) || null;
  const hasHead = refExists(root, 'HEAD');
  let mergeBase = null;
  if (baseRef && hasHead) mergeBase = git(root, ['merge-base', baseRef, 'HEAD'], { allowFail: true });

  let diffArgs;
  if (mode === 'staged') diffArgs = ['--cached'];
  else if (mode === 'base') diffArgs = mergeBase ? [mergeBase, 'HEAD'] : null;
  else diffArgs = mergeBase ? [mergeBase] : (hasHead ? ['HEAD'] : null);

  let files = [];
  if (diffArgs) {
    files = parseNameStatus(git(root, ['diff', '--name-status', '-M', '-z', '--no-color', ...diffArgs]));
  } else if (mode === 'staged') {
    files = parseNameStatus(git(root, ['diff', '--cached', '--name-status', '-M', '-z', '--no-color']));
  }
  const untracked = new Set();
  if (mode === 'worktree') {
    const out = git(root, ['ls-files', '--others', '--exclude-standard', '-z']);
    for (const p of out.split('\0').filter(Boolean)) {
      if (!files.some(f => f.path === p)) { files.push({ status: 'A', path: p }); untracked.add(p); }
    }
  }

  const readTarget = (rel) => {
    if (mode === 'staged') return git(root, ['show', ':' + rel], { allowFail: true });
    if (mode === 'base') return git(root, ['show', 'HEAD:' + rel], { allowFail: true });
    const abs = path.join(root, rel);
    try { return fs.statSync(abs).isFile() ? fs.readFileSync(abs, 'utf8') : null; } catch { return null; }
  };
  const readBase = (rel) => mergeBase ? git(root, ['show', `${mergeBase}:${rel}`], { allowFail: true }) : null;
  const existsTarget = (rel) => {
    if (mode === 'worktree') return fs.existsSync(path.join(root, rel));
    const out = mode === 'staged'
      ? git(root, ['ls-files', '--cached', '--', rel], { allowFail: true })
      : git(root, ['ls-tree', '-r', '--name-only', 'HEAD', '--', rel], { allowFail: true });
    return !!(out && out.trim());
  };
  const listTarget = (relDir) => {
    if (mode === 'worktree') {
      const abs = path.join(root, relDir);
      return fs.existsSync(abs) ? fs.readdirSync(abs) : [];
    }
    const out = mode === 'staged'
      ? git(root, ['ls-files', '--cached', '--', relDir], { allowFail: true })
      : git(root, ['ls-tree', '-r', '--name-only', 'HEAD', '--', relDir], { allowFail: true });
    return (out || '').split('\n').filter(Boolean)
      .map(p => p.slice(relDir.length + 1)).filter(p => p && !p.includes('/'));
  };

  const diffCache = new Map();
  const fileDiff = (rel) => {
    if (diffCache.has(rel)) return diffCache.get(rel);
    let res;
    if (untracked.has(rel)) {
      const t = readTarget(rel);
      res = { added: t == null ? [] : t.split('\n').map((text, i) => ({ line: i + 1, text })), removed: [] };
    } else {
      const args = diffArgs || (mode === 'staged' ? ['--cached'] : []);
      res = parseUnified(git(root, ['diff', '-U0', '--no-color', '--no-ext-diff', ...args, '--', rel], { allowFail: true }));
    }
    diffCache.set(rel, res);
    return res;
  };

  const reader = { read: readTarget, list: listTarget };
  const { tasks, errors: taskErrors } = loadTasks(root, reader);
  const taskId = taskOverride || taskIdFromBranch(branch, cfg.gates);
  const task = taskId ? tasks.get(taskId) || null : null;
  const roleName = task ? task.role : cfg.roles.default_role;

  return {
    root, mode, branch, baseRef, mergeBase,
    cfg: cfg.gates, roles: cfg.roles, checkpointsCfg: cfg.checkpoints,
    tasks, taskErrors, taskId, task, roleName,
    files,
    changed: files.filter(f => f.status !== 'D'),
    added: (rel) => fileDiff(rel).added,
    removed: (rel) => fileDiff(rel).removed,
    read: readTarget, readBase, exists: existsTarget, list: listTarget,
    human: isHuman(root),
    selftest: isSelftestOverride(root),
    isCI: !!process.env.CI,
  };
}
