import { matchAny } from '../lib/glob.mjs';
import { error } from '../lib/util.mjs';

export default {
  id: 'tests-present',
  title: 'Zmieniona logika ma testy',
  run(ctx) {
    const c = ctx.cfg.tests_present;
    const testRx = new RegExp(c.test_file_regex);
    const rules = c.rules || [];
    const out = [];
    const changed = ctx.changed.map(f => f.path);
    for (const r of rules) {
      const src = changed.filter(p => matchAny(p, [r.changed]) && !testRx.test(p));
      if (!src.length) continue;
      if (!changed.some(p => matchAny(p, r.tests))) out.push(error(src[0], `${r.msg} (zmienione: ${src.length} plik(ów), brak zmienionych testów)`));
    }
    return out;
  },
};
