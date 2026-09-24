import { error } from '../lib/util.mjs';

export default {
  id: 'branch',
  title: 'Gałąź i zadanie',
  run(ctx) {
    const out = [];
    const { branch, cfg } = ctx;
    if (process.env.CI && !process.env.GITHUB_HEAD_REF) return out; // push na main w CI: nie dotyczy
    if (cfg.branch.protected.includes(branch)) {
      out.push(error(null, `praca bezpośrednio na '${branch}' jest zabroniona. Uruchom: node .agent-os/scripts/task.mjs start <ID> --agent <claude|gemini>`));
      return out;
    }
    if (!new RegExp(cfg.branch.pattern).test(branch)) {
      out.push(error(null, `nazwa gałęzi '${branch}' nie pasuje do wzorca typ/ID-opis (np. feat/F1-02-migrations)`));
    }
    if (ctx.taskId && !ctx.task) {
      out.push(error(null, `zadanie ${ctx.taskId} z nazwy gałęzi nie ma kontraktu w .agent-os/tasks/${ctx.taskId}.yaml`));
    }
    if (ctx.task && ctx.task.branch && ctx.task.branch !== branch) {
      out.push(error(null, `kontrakt ${ctx.task.id} wymaga gałęzi '${ctx.task.branch}', a jesteś na '${branch}'`));
    }
    return out;
  },
};
