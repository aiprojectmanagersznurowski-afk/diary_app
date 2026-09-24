import { error, checkpoint } from '../lib/util.mjs';
import { roadmapState } from '../lib/context.mjs';

const REQUIRED = ['id', 'title', 'phase', 'role', 'roadmap', 'scope', 'acceptance'];

export function validateTask(t, { roles, tasks, roadmap }) {
  const errs = [];
  for (const k of REQUIRED) if (t[k] == null) errs.push(`brak pola '${k}'`);
  if (t.id && t.__file && !t.__file.endsWith(`/${t.id}.yaml`)) errs.push(`id '${t.id}' nie zgadza się z nazwą pliku`);
  if (t.role && !roles.roles[t.role]) errs.push(`nieznana rola '${t.role}'`);
  if (t.role === 'reviewer') errs.push('zadanie nie może mieć roli reviewer');
  if (t.scope && (!Array.isArray(t.scope.write) || !t.scope.write.length)) errs.push('scope.write musi być niepustą listą');
  if (t.acceptance && (!Array.isArray(t.acceptance) || !t.acceptance.length)) errs.push('acceptance musi być niepustą listą');
  for (const d of t.depends_on || []) if (!tasks.has(d)) errs.push(`depends_on: nieznane zadanie ${d}`);
  if (t.roadmap && roadmap && !roadmap.has(t.roadmap)) errs.push('pole roadmap nie odpowiada żadnej linii "- [ ]" w docs/04-roadmapa.md');
  return errs;
}

export default {
  id: 'contracts',
  title: 'Kontrakty zadań',
  run(ctx) {
    const out = ctx.taskErrors.map(e => error(e.file, e.msg));
    const roadmap = roadmapState(ctx.read(ctx.cfg.roadmap.file));
    const changedTasks = ctx.files.filter(f => f.path.startsWith('.agent-os/tasks/'));
    // pełna walidacja zmienionych kontraktów i kontraktu bieżącego zadania
    const toCheck = new Set(changedTasks.map(f => f.path));
    if (ctx.task) toCheck.add(ctx.task.__file);
    for (const t of ctx.tasks.values()) {
      if (!toCheck.has(t.__file)) continue;
      for (const m of validateTask(t, { roles: ctx.roles, tasks: ctx.tasks, roadmap })) out.push(error(t.__file, m));
    }
    if (changedTasks.length) out.push(checkpoint('CP-TASK', changedTasks[0].path, 'zmiana kontraktu zadania wymaga zatwierdzenia zakresu przez człowieka'));
    return out;
  },
};
