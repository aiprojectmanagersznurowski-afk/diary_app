import { matchAny } from '../lib/glob.mjs';
import { checkpoint } from '../lib/util.mjs';

const DEVICE = ['app.json', 'app.config.{ts,js}', 'plugins/**', 'modules/**', 'targets/**', 'src/infrastructure/audio/**', 'src/**/auth/**', 'src/**/*{Login,Auth,Record}*'];

function deps(json) {
  try {
    const p = JSON.parse(json || '{}');
    return new Set([...Object.keys(p.dependencies || {}), ...Object.keys(p.devDependencies || {})]);
  } catch { return new Set(); }
}

export default {
  id: 'checkpoints',
  title: 'Wyzwalacze checkpointów człowieka',
  run(ctx) {
    const out = [];
    const paths = ctx.changed.map(f => f.path);

    const mig = ctx.files.find(f => f.status === 'A' && f.path.startsWith(ctx.cfg.migrations.dir + '/'));
    if (mig) out.push(checkpoint('CP-MIGRATION', mig.path, 'migracja: przegląd SQL/RLS i "supabase db push" robi człowiek'));

    if (paths.includes('package.json')) {
      const before = deps(ctx.readBase('package.json')), after = deps(ctx.read('package.json'));
      const added = [...after].filter(d => !before.has(d));
      if (added.length) out.push(checkpoint('CP-DEP', 'package.json', `nowe zależności: ${added.join(', ')}`));
    }
    for (const f of ctx.changed.filter(f => /(^|\/)deno\.jsonc?$/.test(f.path))) {
      if (ctx.added(f.path).some(a => /["'](npm|jsr):[^"']+["']/.test(a.text))) out.push(checkpoint('CP-DEP', f.path, 'nowe importy npm:/jsr: w deno.json'));
    }

    const envs = new Set();
    for (const f of ctx.changed.filter(f => !f.path.startsWith('.agent-os/'))) {
      for (const { text } of ctx.added(f.path)) {
        if (f.path.endsWith('.env.example')) { const m = /^([A-Z0-9_]+)=/.exec(text); if (m) envs.add(m[1]); }
        for (const m of text.matchAll(/Deno\.env\.get\(\s*['"]([A-Z0-9_]+)['"]/g)) envs.add(m[1]);
      }
    }
    // zmienne wstrzykiwane automatycznie przez Supabase
    for (const auto of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL']) envs.delete(auto);
    if (envs.size) out.push(checkpoint('CP-SECRETS', null, `zmienne środowiskowe do ustawienia przez człowieka: ${[...envs].join(', ')}`));

    const dev = paths.find(p => matchAny(p, DEVICE));
    if (dev) out.push(checkpoint('CP-DEVICE', dev, 'zmiana wymaga testu na urządzeniu (opisz scenariusz w handoff)'));

    if (ctx.taskId === 'F1-08') out.push(checkpoint('CP-GATE', null, 'po scaleniu F1-08 człowiek ustawia dod.tsc.error_budget = 0'));
    return out;
  },
};
