import { matchAny, match } from '../lib/glob.mjs';
import { error, importSpecs, packageName } from '../lib/util.mjs';

export default {
  id: 'ai-boundary',
  title: 'AI tylko po stronie serwera (ADR-003, ADR-006)',
  run(ctx) {
    const c = ctx.cfg.ai_boundary;
    const out = [];
    const pkgForbidden = (name) => name && c.forbidden_packages.some(p => match(name, p));
    for (const f of ctx.changed) {
      const client = matchAny(f.path, c.client_paths);
      const serverOutsideAi = matchAny(f.path, [c.server_root]) && !matchAny(f.path, [c.server_ai_dir]);
      if (!client && !serverOutsideAi) continue;
      const where = client
        ? 'wywołania AI tylko w supabase/functions/ (ADR-003)'
        : 'dostawców AI wołamy wyłącznie przez supabase/functions/_shared/ai (ADR-006)';
      for (const { line, text } of ctx.added(f.path)) {
        for (const spec of importSpecs(text)) {
          if (pkgForbidden(packageName(spec))) out.push(error(f.path, `import '${spec}': ${where}`, line));
        }
        for (const host of c.forbidden_hosts) {
          if (text.includes(host)) out.push(error(f.path, `odwołanie do ${host}: ${where}`, line));
        }
      }
    }
    return out;
  },
};
