import { matchAny } from '../lib/glob.mjs';
import { error } from '../lib/util.mjs';

export default {
  id: 'logging',
  title: 'Brak logowania treści użytkownika',
  run(ctx) {
    const c = ctx.cfg.logging;
    const call = new RegExp(c.call);
    const sensitive = new RegExp(c.sensitive, 'i');
    const out = [];
    for (const f of ctx.changed) {
      if (!matchAny(f.path, c.paths) || /\.(md|json|sql)$/.test(f.path)) continue;
      for (const { line, text } of ctx.added(f.path)) {
        const m = call.exec(text);
        if (!m) continue;
        // zwykłe literały tekstowe to komunikaty, nie dane; szablony `${...}` sprawdzamy
        const args = text.slice(m.index + m[0].length).replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''");
        if (sensitive.test(args)) {
          out.push(error(f.path, 'logowanie treści transkrypcji / notatek / odpowiedzi LLM jest zabronione (loguj ID i status)', line));
        }
      }
    }
    return out;
  },
};
