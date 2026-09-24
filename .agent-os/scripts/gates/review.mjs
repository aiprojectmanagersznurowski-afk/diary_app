import { error, frontmatter } from '../lib/util.mjs';
import { AGENTS } from '../lib/context.mjs';

export default {
  id: 'review',
  title: 'Recenzja krzyżowa (drugi agent)',
  run(ctx) {
    if (!ctx.task) return [];
    const c = ctx.cfg.review;
    const file = `${c.dir}/${ctx.task.id}.md`;
    const text = ctx.read(file);
    if (text == null) return [error(file, 'brak recenzji; drugi agent uruchamia workflow /review')];
    const fm = frontmatter(text) || {};
    const impl = (frontmatter(ctx.read(`.agent-os/handoff/${ctx.task.id}.md`)) || {}).implementer;
    const out = [];
    if (!AGENTS.includes(fm.reviewer)) out.push(error(file, `reviewer musi być jednym z: ${AGENTS.join(', ')}`));
    if (fm.verdict !== 'approve') out.push(error(file, `werdykt recenzji: "${fm.verdict || 'brak'}" (wymagane: approve)`));
    if (c.require_cross_agent && fm.reviewer && fm.reviewer === impl) {
      out.push(error(file, `recenzent (${fm.reviewer}) nie może być implementującym; recenzję robi drugi agent`));
    }
    return out;
  },
};
