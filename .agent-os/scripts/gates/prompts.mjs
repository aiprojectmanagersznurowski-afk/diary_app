import path from 'node:path';
import { matchAny } from '../lib/glob.mjs';
import { error, frontmatter } from '../lib/util.mjs';

export default {
  id: 'prompts',
  title: 'Prompty wersjonowane + schemat zod',
  run(ctx) {
    const c = ctx.cfg.prompts;
    const out = [];
    const inDir = (p) => p && p.startsWith(c.dir + '/');
    const fnRx = new RegExp(c.filename);
    for (const f of ctx.files) {
      if (!inDir(f.path) && !inDir(f.oldPath)) continue;
      if (f.status !== 'A') {
        out.push(error(f.oldPath || f.path, 'treść opublikowanego promptu jest niezmienna: utwórz plik z kolejną wersją (np. structure.v2.md) i przełącz na nią kod'));
        continue;
      }
      const base = path.posix.basename(f.path);
      if (!base.endsWith('.md')) continue;
      if (!fnRx.test(base)) {
        out.push(error(f.path, 'nazwa promptu: <nazwa>.v<N>.md'));
        continue;
      }
      const fm = frontmatter(ctx.read(f.path));
      const isFragment = matchAny(f.path, c.fragment_dirs || []);
      if (!fm || !fm.schema) {
        out.push(error(f.path, 'prompt musi mieć nagłówek YAML z polem "schema: <nazwa>" (schemat zod odpowiedzi)'));
        continue;
      }
      if (fm.schema === 'none') {
        if (!isFragment) out.push(error(f.path, '"schema: none" dozwolone tylko dla fragmentów (personalities/, fragments/)'));
        continue;
      }
      const schemaFile = `${c.schemas_dir}/${fm.schema}.ts`;
      if (!ctx.exists(schemaFile)) out.push(error(f.path, `brak schematu zod ${schemaFile}`));
    }
    return out;
  },
};
