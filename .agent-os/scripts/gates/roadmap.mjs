import { error } from '../lib/util.mjs';
import { roadmapState } from '../lib/context.mjs';

export default {
  id: 'roadmap',
  title: 'Zadanie odhaczone w roadmapie',
  run(ctx) {
    if (!ctx.task) return [];
    const file = ctx.cfg.roadmap.file;
    const after = roadmapState(ctx.read(file));
    const before = roadmapState(ctx.readBase(file));
    const out = [];
    if (after.get(ctx.task.roadmap) !== true) {
      out.push(error(file, `odhacz "- [x] ${ctx.task.roadmap}"`));
    }
    const allowed = new Set([ctx.task.roadmap, ...(ctx.task.roadmap_extra || [])]);
    for (const [text, checked] of after) {
      if (checked && before.get(text) === false && !allowed.has(text)) {
        out.push(error(file, `odhaczono pozycję spoza zadania ${ctx.task.id}: "${text.slice(0, 80)}"`));
      }
    }
    return out;
  },
};
