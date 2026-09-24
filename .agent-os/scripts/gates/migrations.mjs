import path from 'node:path';
import { matchAny } from '../lib/glob.mjs';
import { error, stripSqlComments } from '../lib/util.mjs';

const ident = '(?:"[^"]+"|[a-z_][a-z0-9_$]*)';
const qname = `(${ident}(?:\\s*\\.\\s*${ident})?)`;

function norm(name) {
  const parts = name.replace(/\s+/g, '').split('.').map(s => s.replace(/^"|"$/g, ''));
  return parts.length === 1 ? 'public.' + parts[0] : parts.join('.');
}

export function analyzeSql(sqlRaw) {
  const sql = stripSqlComments(sqlRaw).toLowerCase();
  const tables = [...sql.matchAll(new RegExp(`create\\s+(?:unlogged\\s+)?table\\s+(?:if\\s+not\\s+exists\\s+)?${qname}`, 'g'))].map(m => norm(m[1]));
  const rls = new Set([...sql.matchAll(new RegExp(`alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?${qname}\\s+enable\\s+row\\s+level\\s+security`, 'g'))].map(m => norm(m[1])));
  const policies = new Set([...sql.matchAll(new RegExp(`create\\s+policy\\s+(?:"[^"]+"|[a-z_][a-z0-9_]*)\\s+on\\s+${qname}`, 'g'))].map(m => norm(m[1])));
  return { tables, rls, policies };
}

export default {
  id: 'migrations',
  title: 'Migracje (RLS, niezmienność, osobny PR)',
  run(ctx) {
    const c = ctx.cfg.migrations;
    const out = [];
    const inDir = (p) => p && p.startsWith(c.dir + '/');
    const fnRx = new RegExp(c.filename);
    let any = false;
    for (const f of ctx.files) {
      if (!inDir(f.path) && !inDir(f.oldPath)) continue;
      if (!f.path.endsWith('.sql') && f.status !== 'D') continue;
      any = true;
      if (f.status !== 'A') {
        out.push(error(f.oldPath || f.path, 'istniejącej migracji nie wolno zmieniać, usuwać ani przenosić; dodaj nową migrację'));
        continue;
      }
      if (!fnRx.test(path.posix.basename(f.path))) {
        out.push(error(f.path, 'nazwa migracji: YYYYMMDDHHMMSS_opis.sql (supabase migration new <opis>)'));
      }
      const { tables, rls, policies } = analyzeSql(ctx.read(f.path) || '');
      for (const t of tables) {
        const schema = t.split('.')[0];
        if ((c.rls_exempt_schemas || []).includes(schema)) continue;
        if (!rls.has(t)) out.push(error(f.path, `tabela ${t} bez "alter table ... enable row level security"`));
        if (!policies.has(t)) out.push(error(f.path, `tabela ${t} bez polityk RLS ("create policy ... on ${t}")`));
      }
    }
    if (any && ctx.mode !== 'staged') {
      const extra = ctx.files.filter(f => !matchAny(f.path, c.pr_companions));
      if (extra.length) {
        out.push(error(null, `zmiana schematu idzie w osobnym PR, przed kodem (06-zasady-pracy). Poza migracją zmienione: ${extra.slice(0, 5).map(f => f.path).join(', ')}${extra.length > 5 ? '…' : ''}`));
      }
    }
    return out;
  },
};
