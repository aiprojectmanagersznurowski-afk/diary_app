import { matchAny } from '../lib/glob.mjs';
import { error } from '../lib/util.mjs';

export default {
  id: 'native',
  title: 'Natywne katalogi generowane',
  run(ctx) {
    return ctx.files
      .filter(f => matchAny(f.path, ctx.cfg.native.generated))
      .map(f => error(f.path, 'ios/ i android/ są generowane (CNG). Zmiany natywne tylko przez app.json i wtyczki konfiguracyjne'));
  },
};
