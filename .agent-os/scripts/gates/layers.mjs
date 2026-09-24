import path from 'node:path';
import { builtinModules } from 'node:module';
import { matchAny, match } from '../lib/glob.mjs';
import { error, importSpecs, packageName } from '../lib/util.mjs';

const BUILTINS = new Set(builtinModules);

function layerOf(rel, root) {
  const m = new RegExp('^' + root + '/([^/]+)/').exec(rel);
  return m ? m[1] : null;
}

export default {
  id: 'layers',
  title: 'Warstwy src/ (02-architektura §3)',
  run(ctx) {
    const c = ctx.cfg.layers;
    const out = [];
    for (const f of ctx.changed) {
      if (!/\.(ts|tsx|js|jsx|mjs)$/.test(f.path)) continue;
      if (matchAny(f.path, c.composition_root || [])) continue;
      const layer = layerOf(f.path, c.root);
      const rule = layer && c.rules[layer];
      if (!rule) continue;
      const dir = path.posix.dirname(f.path);
      for (const { line, text } of ctx.added(f.path)) {
        for (const spec of importSpecs(text)) {
          let target = null;
          if (spec.startsWith('.')) target = path.posix.normalize(path.posix.join(dir, spec));
          else {
            const alias = Object.keys(c.aliases || {}).find(a => spec.startsWith(a));
            if (alias) target = c.aliases[alias] + spec.slice(alias.length);
          }
          if (target) {
            const tl = layerOf(target + '/', c.root);
            if (tl && c.rules[tl] && !rule.may_import.includes(tl)) {
              out.push(error(f.path, `warstwa '${layer}' nie może importować z '${tl}' ('${spec}')`, line));
            }
            continue;
          }
          if (rule.external === '*') continue;
          const pkg = packageName(spec);
          if (!pkg || BUILTINS.has(pkg)) continue;
          const ok = (rule.external || []).some(p => match(spec, p) || match(pkg, p));
          if (!ok) out.push(error(f.path, `warstwa '${layer}' nie może zależeć od biblioteki '${pkg}'`, line));
        }
      }
    }
    return out;
  },
};
