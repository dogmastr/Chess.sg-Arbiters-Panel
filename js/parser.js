/* Reads a table copied from chess-results (Starting rank, Standings or Crosstable) into a player list. Text in, players out. */

function scoreOf(t) {
  if (t == null || t === '') return null;
  if (/^(1|\+)$/.test(t)) return 1;
  if (/^(0|-)$/.test(t)) return 0;
  if (/^(½|=|0,5|0\.5|1\/2)$/.test(t)) return 0.5;
  return null;
}
function numOf(t) {
  t = String(t || '').trim().replace(/½/, '.5').replace(',', '.');
  if (/^\.5$/.test(t)) return 0.5;
  const v = parseFloat(t);
  return isNaN(v) ? null : v;
}
/* A round cell such as "19w1" means: opponent ranked 19, played white, won. Copies from
   chess-results can lose the colour letter ("191") or split the cell in parts, so every
   reading that fits is kept and the opponent's row of the same round decides between them. */
function cleanCell(t) {
  return String(t || '').toLowerCase()
    .replace(/[−‐-―]/g, '-')
    .replace(/1\/2|0[.,]5/g, '½')
    .replace(/[^0-9wbs½=+\-]/g, '');
}
function roundCandidates(raw, selfId, valid) {
  const t = cleanCell(raw);
  if (!t) return [];
  const ok = o => o !== selfId && valid(o);
  let m = /^(\d+)([wbs])(1|0|½|=|\+|-)?$/.exec(t);
  if (m) return ok(+m[1]) ? [{ opp: +m[1], color: m[2], score: scoreOf(m[3] || ''), forfeit: /[+-]/.test(m[3] || '') }] : [];
  if (/^[-+][wbs]?(1|0|½)?$/.test(t)) {                       // bye or unplayed round: "-1", "+", "-0"
    const s = t.replace(/^[-+][wbs]?/, '');
    return [{ opp: null, score: s ? scoreOf(s) : scoreOf(t[0]), bye: true }];
  }
  m = /^(\d+)(½|=|\+|-)$/.exec(t);
  if (m) return ok(+m[1]) ? [{ opp: +m[1], color: '', score: scoreOf(m[2]), forfeit: /[+-]/.test(m[2]) }] : [];
  if (/^\d+$/.test(t)) {                                       // no colour letter: "191" or a pending "5"
    const c = [];
    if (ok(+t)) c.push({ opp: +t, color: '', score: null });
    if (t.length > 1 && /[01]$/.test(t) && ok(+t.slice(0, -1))) c.push({ opp: +t.slice(0, -1), color: '', score: +t.slice(-1) });
    return c;
  }
  return [];
}
function tokenizeRounds(text, count) {
  const toks = String(text).match(/\d+\s*[wbs]\s*(?:1|0|½|=|\+|-)?|[-+]\s*[wbs]?\s*(?:1|0|½)?/gi) || [];
  return Array.from({ length: count }, (_, k) => toks[k] || '');
}
function parseChessResults(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const hi = lines.findIndex(l => {
    const c = l.split('\t').map(x => x.trim().toLowerCase());
    return c.includes('name') && c.length >= 3 && (c.some(x => /^pts\.?$/.test(x)) || c.some(x => /^(rtg|elo)$/.test(x)));
  });
  if (hi < 0) return { error: 'No chess-results table found. Copy the whole page (Ctrl+A, then Ctrl+C) and paste it again.' };
  const H = lines[hi].split('\t').map(x => x.trim());
  const find = re => H.findIndex(h => re.test(h));
  const col = { rk: find(/^rk\.?$/i), no: find(/^(sno|no\.?|nr\.?)$/i), name: find(/^name$/i), rtg: find(/^(rtg|elo|rating)$/i), fed: find(/^fed$/i), typ: find(/^(typ|type|gr\.?|group|cat\.?)$/i), pts: find(/^pts\.?$/i) };
  const rounds = [];
  H.forEach((h, i) => { const m = /^(?:(\d+)\.?\s*rd\.?|rd\.?\s*(\d+)|r\s*(\d+))$/i.exec(h); if (m) rounds.push({ i, n: Number(m[1] || m[2] || m[3]) }); });
  const tbs = [];
  H.forEach((h, i) => { if (/^tb\s*\d+$/i.test(h)) tbs.push(i); });
  const labeled = H.map((h, i) => (h ? i : -1)).filter(i => i >= 0);
  const nextLabel = i => { const j = labeled.find(x => x > i); return j == null ? H.length : j; };
  const firstR = rounds.length ? rounds[0].i : -1, lastR = rounds.length ? rounds[rounds.length - 1].i : -1;
  const idCol = col.rk >= 0 ? col.rk : (col.no >= 0 ? col.no : 0);
  const rows = [];
  for (let k = hi + 1; k < lines.length; k++) {
    const c = lines[k].split('\t').map(x => x.trim());
    const extra = rounds.length ? Math.max(0, c.length - H.length) : 0;   // round cells split into parts
    const at = i => (i < 0 ? undefined : c[extra && i > lastR ? i + extra : i]);
    const nm = at(col.name) || '';
    if (!/^\d+$/.test(at(idCol) || '') || !/[a-z]/i.test(nm)) { if (rows.length) break; continue; }
    let rcells = [];
    if (rounds.length && extra) {
      const region = c.slice(firstR, nextLabel(lastR) + extra), per = region.length / rounds.length;
      rcells = Number.isInteger(per) ? rounds.map((_, q) => region.slice(q * per, (q + 1) * per).join('')) : tokenizeRounds(region.join(' '), rounds.length);
    } else if (rounds.length) {
      rcells = rounds.map(({ i }) => c.slice(i, nextLabel(i)).join(''));
    }
    rows.push({
      id: Number(at(idCol)), name: nm.replace(/\s*,\s*/, ', '),
      rtg: col.rtg >= 0 ? (numOf(at(col.rtg)) || 0) : null,
      fed: col.fed >= 0 ? at(col.fed) || '' : '',
      typ: col.typ >= 0 ? at(col.typ) : null,
      pts: col.pts >= 0 ? numOf(at(col.pts)) : null,
      tbs: tbs.map(i => numOf(at(i))),
      rcells
    });
  }
  if (!rows.length) return { error: 'Found the header but no player rows. Copy the whole page (Ctrl+A, then Ctrl+C) and paste it again.' };
  const byId = new Map(rows.map(r => [r.id, r]));
  rows.forEach(r => { r.cand = r.rcells.map(t => roundCandidates(t, r.id, o => byId.has(o))); });
  const mutual = (r, q, c) => {
    if (c.opp == null) return true;
    const o = byId.get(c.opp);
    return !!o && o.cand[q].some(d => d.opp === r.id && (c.score == null) === (d.score == null) && (c.score == null || c.forfeit || d.forfeit || Math.abs(c.score + d.score - 1) < 1e-9));
  };
  const resolve = after => rows.forEach(r => {
    r.pick = r.cand.map((cs, q) => {
      if (cs.length <= 1) return cs[0] || null;
      const m = cs.filter(c => mutual(r, q, c)), pool = m.length ? m : cs;
      if (pool.length === 1 || after == null) return pool[0];
      const pref = pool.filter(c => (c.score != null) === (rounds[q].n <= after));
      return (pref.length ? pref : pool)[0];
    });
  });
  let after = null;
  const am = /after\s+(?:round\s+(\d+)|(\d+)\s+rounds)/i.exec(text);   // "Rank after Round 3", "Final Ranking after 7 Rounds"
  if (am) after = Number(am[1] || am[2]);
  resolve(after);
  if (after == null && rounds.length) {
    after = rounds.filter((rd, q) => rows.filter(r => r.pick[q] && r.pick[q].score != null).length >= rows.length / 2).length;
    resolve(after);
  }
  let gameCells = 0;
  const players = rows.map(r => {
    const res = r.pick.map((x, q) => x && {
      round: rounds[q].n, color: x.color || '', score: x.score, bye: !!x.bye, forfeit: !!x.forfeit,
      opp: x.opp != null ? nameKey(byId.get(x.opp).name) : null
    }).filter(Boolean);
    gameCells += res.filter(x => x.opp && x.score != null && !x.forfeit).length;
    return { name: r.name, key: nameKey(r.name), fed: r.fed, rtg: r.rtg, typ: r.typ, pts: r.pts, rk: col.rk >= 0 ? r.id : null, sno: r.id, tbs: r.tbs, res };
  });
  const tm = /(\d+)\s+rds?\b/i.exec(text);             // "7 Rds" in the tournament's name. The space is required: "43rd" is not 43 rounds
  return { players, after, games: Math.round(gameCells / 2), total: Math.max(tm ? Number(tm[1]) : 0, ...rounds.map(x => x.n)), hasPts: col.pts >= 0, hasRounds: rounds.length > 0 };
}
