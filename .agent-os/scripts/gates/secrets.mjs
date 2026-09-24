import { matchAny } from '../lib/glob.mjs';
import { error, warn } from '../lib/util.mjs';

export default {
  id: 'secrets',
  title: 'Sekrety',
  run(ctx) {
    const c = ctx.cfg.secrets;
    const out = [];
    const patterns = c.patterns.map(p => ({ ...p, rx: new RegExp(p.regex) }));
    const warns = (c.warn || []).map(p => ({ ...p, rx: new RegExp(p.regex) }));
    const forbiddenName = new RegExp(c.expo_public_forbidden);
    const srx = new RegExp(c.service_role_regex);

    for (const f of ctx.changed) {
      if (matchAny(f.path, c.forbidden_files)) {
        out.push(error(f.path, 'tego pliku nie wolno commitować (sekrety / konfiguracja Firebase); wolno go tylko usunąć'));
        continue;
      }
      const skip = matchAny(f.path, c.skip_paths);
      for (const { line, text } of ctx.added(f.path)) {
        if (!skip) {
          for (const p of patterns) if (p.rx.test(text)) out.push(error(f.path, `${p.msg} [${p.id}]`, line));
          for (const p of warns) if (matchAny(f.path, p.paths || ['**']) && p.rx.test(text)) out.push(warn(f.path, p.msg, line));
        }
        for (const m of (skip ? [] : text.matchAll(/EXPO_PUBLIC_[A-Z0-9_]+/g))) {
          const name = m[0];
          if (forbiddenName.test(name.slice('EXPO_PUBLIC_'.length)) && !c.expo_public_allow.includes(name)) {
            out.push(error(f.path, `${name}: przedrostek EXPO_PUBLIC_ oznacza „trafi do pakietu aplikacji”; sekret należy do sekretów Supabase`, line));
          }
        }
        if (matchAny(f.path, c.service_role_client_paths) && srx.test(text)) {
          out.push(error(f.path, 'service_role w kodzie klienta', line));
        }
      }
    }
    return out;
  },
};
