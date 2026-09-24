#!/usr/bin/env node
// Hook "przed użyciem narzędzia" wspólny dla Claude Code (PreToolUse) i Gemini CLI (BeforeTool).
// Blokuje (exit 2 + powód na stderr): zapis poza zakresem roli/zadania, zapis na gałęzi chronionej,
// komendy z listy agent_never (checkpoints.yaml), zapis w ścieżkach chronionych przez shell.
// Antigravity nie ma hooków: tam te same reguły egzekwują hooki git i CI.

import path from 'node:path';
import fs from 'node:fs';
import { loadConfig, loadTasks, taskIdFromBranch, isHuman } from '../lib/context.mjs';
import { repoRoot, currentBranch } from '../lib/git.mjs';
import { checkPath } from '../gates/scope.mjs';
import { matchAny } from '../lib/glob.mjs';

const FILE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'write_file', 'replace', 'edit', 'write_todos_file']);
const SHELL_TOOLS = new Set(['Bash', 'run_shell_command', 'shell']);
const WRITE_OPS = /(^|[\s;&|(])(>>?|tee|sed\s+-i|perl\s+-pi|mv|cp|rm|truncate|chmod|install|ln)(\s|$)/;

function block(reason) {
  process.stderr.write(`[Agent OS] ZABLOKOWANE: ${reason}\n`);
  process.exit(2);
}

let raw = '';
try { raw = fs.readFileSync(0, 'utf8'); } catch { process.exit(0); }
let input;
try { input = JSON.parse(raw || '{}'); } catch { process.exit(0); }

const tool = input.tool_name || '';
const ti = input.tool_input || {};
let root;
try { root = repoRoot(input.cwd || process.env.CLAUDE_PROJECT_DIR || process.env.GEMINI_PROJECT_DIR || process.cwd()); } catch { process.exit(0); }
if (!fs.existsSync(path.join(root, '.agent-os/contracts/roles.yaml'))) process.exit(0);

const cfg = loadConfig(root);
const branch = currentBranch(root);
const human = isHuman(root);
const { tasks } = loadTasks(root);
const taskId = taskIdFromBranch(branch, cfg.gates);
const task = taskId ? tasks.get(taskId) : null;
const roleName = task ? task.role : cfg.roles.default_role;
const onProtected = cfg.gates.branch.protected.includes(branch);

if (FILE_TOOLS.has(tool)) {
  const fp = ti.file_path || ti.notebook_path || ti.path || ti.absolute_path;
  if (!fp) process.exit(0);
  const abs = path.resolve(input.cwd || root, fp);
  const rel = path.relative(root, abs).split(path.sep).join('/');
  if (rel.startsWith('..') || path.isAbsolute(rel)) process.exit(0); // poza repozytorium
  if (onProtected && !human) block(`jesteś na '${branch}'. Najpierw: node .agent-os/scripts/task.mjs start <ID> --agent <claude|gemini>`);
  if (taskId && !task) block(`gałąź wskazuje zadanie ${taskId}, ale nie ma kontraktu .agent-os/tasks/${taskId}.yaml`);
  const msg = checkPath(rel, { roles: cfg.roles, task, roleName, human });
  if (msg) block(`${rel}: ${msg}. Jeśli zadanie naprawdę tego wymaga, zatrzymaj się i poproś człowieka o zmianę kontraktu (CP-TASK).`);
  process.exit(0);
}

if (SHELL_TOOLS.has(tool)) {
  const cmd = String(ti.command || '');
  for (const r of cfg.checkpoints.agent_never || []) {
    if (new RegExp(r.regex).test(cmd)) block(`${r.msg}  (komenda: ${cmd.slice(0, 120)})`);
  }
  if (!human && onProtected && /\bgit\s+commit\b/.test(cmd)) block(`commit na '${branch}' zabroniony; pracuj na gałęzi zadania`);
  if (!human && WRITE_OPS.test(cmd)) {
    const tokens = cmd.split(/[\s;&|()<>'"=]+/).filter(Boolean);
    const hit = tokens.find(t => {
      const rel = t.replace(/^\.\//, '');
      return rel && matchAny(rel, cfg.roles.global_deny);
    });
    if (hit) block(`komenda modyfikuje ścieżkę chronioną (${hit}); zmienia ją tylko człowiek`);
  }
  process.exit(0);
}

process.exit(0);
