import { error, frontmatter } from '../lib/util.mjs';
import { AGENTS } from '../lib/context.mjs';

export const HANDOFF_SECTIONS = ['## Stan', '## Sprawdzone ręcznie', '## Zmienione dokumenty', '## Checkpointy'];

export default {
  id: 'handoff',
  title: 'Handoff kompletny',
  run(ctx, { checkpoints = [] } = {}) {
    if (!ctx.task) return [];
    const file = `.agent-os/handoff/${ctx.task.id}.md`;
    const text = ctx.read(file);
    if (text == null) return [error(file, 'brak pliku handoff (node .agent-os/scripts/task.mjs start tworzy go z szablonu)')];
    const out = [];
    const fm = frontmatter(text) || {};
    if (!AGENTS.includes(fm.implementer)) out.push(error(file, `implementer musi być jednym z: ${AGENTS.join(', ')}`));
    if (!['review', 'done'].includes(fm.status)) out.push(error(file, 'status musi być "review" (gotowe do recenzji) albo "done"'));
    for (const s of HANDOFF_SECTIONS) {
      const rx = new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\n+([\\s\\S]*?)(?=\\n## |$)', 'm');
      const m = rx.exec(text);
      const body = m ? m[1].replace(/<!--[\s\S]*?-->/g, '').trim() : '';
      if (!m) out.push(error(file, `brak sekcji "${s}"`));
      else if (!body || body === '-') out.push(error(file, `sekcja "${s}" jest pusta`));
    }
    const ids = [...new Set(checkpoints.map(c => c.id))];
    for (const id of ids) if (!text.includes(id)) out.push(error(file, `zgłoś ${id} w sekcji "## Checkpointy" (czego potrzebujesz od człowieka)`));
    return out;
  },
};
