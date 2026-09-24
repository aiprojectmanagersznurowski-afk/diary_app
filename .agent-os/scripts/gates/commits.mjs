import { git } from '../lib/git.mjs';
import { error } from '../lib/util.mjs';

export function checkSubject(subject, c) {
  if ((c.allow || []).some(a => new RegExp(a).test(subject))) return null;
  if (!new RegExp(c.pattern).test(subject)) return 'komunikat w formacie Conventional Commits: feat|fix|build|chore|docs|refactor|test|ci|perf: opis';
  if (new RegExp(c.forbid_in_subject).test(subject)) return 'komunikat commita po angielsku (bez polskich znaków)';
  if (subject.length > c.max_subject) return `temat commita dłuższy niż ${c.max_subject} znaków`;
  return null;
}

export default {
  id: 'commits',
  title: 'Komunikaty commitów',
  run(ctx) {
    if (!ctx.mergeBase) return [];
    const log = git(ctx.root, ['log', '--format=%h%x09%s', `${ctx.mergeBase}..HEAD`], { allowFail: true }) || '';
    const out = [];
    for (const row of log.split('\n').filter(Boolean)) {
      const [sha, subject] = row.split('\t');
      const msg = checkSubject(subject, ctx.cfg.commit_msg);
      if (msg) out.push(error(null, `${sha} "${subject}": ${msg}`));
    }
    return out;
  },
};
