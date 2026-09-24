import { error, warn, checkpoint } from '../lib/util.mjs';

/** Dzieli plik ADR na bloki: { num, start, end, status } (linie 1-based), oraz linię nagłówka otwartych kwestii. */
export function parseAdr(text, c) {
  const lines = (text || '').split('\n');
  const hdr = new RegExp(c.header);
  const blocks = [];
  let openAt = Infinity;
  lines.forEach((l, i) => {
    const n = i + 1;
    if (l.trim() === c.open_questions_heading) openAt = Math.min(openAt, n);
    const m = hdr.exec(l);
    if (m && n < openAt) {
      if (blocks.length) blocks[blocks.length - 1].end = n - 1;
      blocks.push({ num: +m[1], start: n, end: lines.length, status: null });
    }
    const st = /^\*\*Status:\*\*\s*(\S+)/.exec(l);
    if (st && blocks.length && !blocks[blocks.length - 1].status) blocks[blocks.length - 1].status = st[1].replace(/[,.]$/, '');
  });
  if (blocks.length && openAt !== Infinity) blocks[blocks.length - 1].end = Math.min(blocks[blocks.length - 1].end, openAt - 1);
  return { blocks, openAt };
}

export default {
  id: 'adr',
  title: 'ADR tylko dopisywane; agent proponuje, człowiek przyjmuje',
  run(ctx) {
    const c = ctx.cfg.adr;
    const f = ctx.files.find(x => x.path === c.file);
    if (!f) return [];
    if (f.status === 'D') return [error(c.file, 'nie wolno usuwać pliku decyzji')];
    const out = [];
    const before = parseAdr(ctx.readBase(c.file), c);
    const after = parseAdr(ctx.read(c.file), c);

    for (const r of ctx.removed(c.file)) {
      if (r.line >= before.openAt) {
        out.push(warn(c.file, 'zmiana w otwartych kwestiach', r.line));
        continue;
      }
      const blk = before.blocks.find(b => r.line >= b.start && r.line <= b.end);
      if (blk && blk.status === c.agent_status) {
        out.push(warn(c.file, `zmiana ADR-${String(blk.num).padStart(3, '0')} (status: ${blk.status})`, r.line));
      } else if (!ctx.human) {
        out.push(error(c.file, `treść przyjętej decyzji jest niezmienna${blk ? ` (ADR-${String(blk.num).padStart(3, '0')})` : ''}; dodaj nowy ADR, który ją zastępuje`, r.line));
      }
    }

    // numeracja ciągła
    after.blocks.forEach((b, i) => {
      if (b.num !== i + 1) out.push(error(c.file, `numeracja ADR nieciągła: oczekiwano ADR-${String(i + 1).padStart(3, '0')}, jest ADR-${String(b.num).padStart(3, '0')}`, b.start));
    });

    // nowe ADR dodane przez agenta muszą mieć status "proponowana"
    const beforeNums = new Set(before.blocks.map(b => b.num));
    for (const b of after.blocks.filter(b => !beforeNums.has(b.num))) {
      if (!b.status) out.push(error(c.file, `ADR-${String(b.num).padStart(3, '0')} bez linii "**Status:** ..."`, b.start));
      else if (b.status !== c.agent_status && !ctx.human) {
        out.push(error(c.file, `ADR-${String(b.num).padStart(3, '0')}: agent dodaje decyzję ze statusem "${c.agent_status}"; przyjmuje ją człowiek (CP-ADR)`, b.start));
      }
    }
    out.push(checkpoint('CP-ADR', c.file, 'zmiana decyzji architektonicznych wymaga akceptacji człowieka'));
    return out;
  },
};
