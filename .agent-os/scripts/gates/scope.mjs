import { matchAny } from '../lib/glob.mjs';
import { error, warn } from '../lib/util.mjs';

/** Sprawdza jedną ścieżkę. Zwraca null (OK) albo komunikat. Używane też przez hooki agentów. */
export function checkPath(p, { roles, task, roleName, isDelete = false, human = false }) {
  if (matchAny(p, roles.global_deny)) {
    return human ? null : 'ścieżka chroniona (global_deny): zmienia ją tylko człowiek';
  }
  const role = roles.roles[roleName];
  if (!role) return `nieznana rola '${roleName}'`;
  const common = matchAny(p, roles.common_write);
  const del = isDelete && task && matchAny(p, task.scope?.delete || []);
  if (del) return null;
  if (!common && !matchAny(p, role.write)) return `poza uprawnieniami roli '${roleName}'`;
  if (task && !common && !matchAny(p, task.scope?.write || [])) return `poza zakresem zadania ${task.id} (scope.write)`;
  return null;
}

export default {
  id: 'scope',
  title: 'Zakres zapisu (rola ∩ zadanie)',
  run(ctx) {
    const out = [];
    if (ctx.human) return [warn(null, 'tryb człowieka: zakres zapisu nie jest sprawdzany')];
    for (const f of ctx.files) {
      const entries = f.status === 'R'
        ? [[f.oldPath, true], [f.path, false]]
        : [[f.path, f.status === 'D']];
      for (const [p, isDelete] of entries) {
        const msg = checkPath(p, { roles: ctx.roles, task: ctx.task, roleName: ctx.roleName, isDelete, human: ctx.human });
        if (msg) out.push(error(p, msg));
      }
    }
    return out;
  },
};
