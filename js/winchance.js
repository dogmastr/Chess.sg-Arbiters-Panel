/* ---------- standings: win chances ----------
   Every player's strength is uncertain. It starts from their rating (unrated players share a
   starting guess, which the event's results adjust) and is then updated with their results here.
   Each simulated tournament draws a strength for every player from that estimate, plays the
   published pairings, pairs the remaining rounds Swiss-style and ranks the final scores. */
let simRes = null, simT = null;
const SIMS = 6000, DRAW = 0.12, GRID = [];
for (let x = 200; x <= 2800; x += 20) GRID.push(x);
function outcome(ra, rb) {
  const E = 1 / (1 + Math.pow(10, (rb - ra) / 400)), d = DRAW * (1 - Math.abs(2 * E - 1));
  return [Math.max(1e-9, E - d / 2), Math.max(1e-9, d), Math.max(1e-9, 1 - E - d / 2)];
}
function strengths(data) {
  const P = data.players, n = P.length, idx = new Map(P.map((p, i) => [p.key, i]));
  const def = Number(S.unratedRtg) || 1000;
  const rated = P.map(p => p.rtg > 0);
  const games = P.map(p => p.res.filter(x => x.opp && x.score != null && !x.forfeit && idx.has(x.opp)).map(x => ({ j: idx.get(x.opp), s: x.score })));
  const anyGames = games.some(g => g.length);
  let mu = def, mean = P.map((p, i) => (rated[i] ? p.rtg : mu)), post = [];
  for (let it = 0; it < 8; it++) {
    const field = mean.reduce((a, b) => a + b, 0) / n;
    post = P.map((p, i) => {
      const m0 = rated[i] ? p.rtg : mu, s0 = rated[i] ? 160 : 350;
      const lp = GRID.map(x => -((x - m0) * (x - m0)) / (2 * s0 * s0));
      if (games[i].length) {
        games[i].forEach(({ j, s }) => GRID.forEach((x, k) => { const o = outcome(x, mean[j]); lp[k] += Math.log(s === 1 ? o[0] : (s === 0 ? o[2] : o[1])); }));
      } else if (!anyGames && data.afterRound > 0 && p.pts != null) {
        const g = data.afterRound, w = Math.min(p.pts, g), l = g - w;   // only points known: games against an average opponent
        GRID.forEach((x, k) => { const o = outcome(x, field); lp[k] += w * Math.log(o[0] + o[1] / 2) + l * Math.log(o[2] + o[1] / 2); });
      }
      const mx = Math.max(...lp), wt = lp.map(v => Math.exp(v - mx)), sum = wt.reduce((a, b) => a + b, 0);
      return wt.map(v => v / sum);
    });
    mean = post.map(pr => pr.reduce((a, v, k) => a + v * GRID[k], 0));
    const um = mean.filter((_, i) => !rated[i]);
    if (um.length) mu = (def * 4 + um.reduce((a, b) => a + b, 0)) / (4 + um.length);
  }
  const cdf = post.map(pr => { let c = 0; return pr.map(v => (c += v)); });
  return { mean, cdf, mu };
}
function simulate(data, sims) {
  const P = data.players, n = P.length;
  if (!n) return null;
  const idx = new Map(P.map((p, i) => [p.key, i]));
  const done = data.afterRound, total = Math.max(totalRounds(), done);
  const grp = P.map(groupsOf);
  const out = new Map();
  if (done >= total && P.every(p => p.rk)) {          // finished: the official order decides
    const seen = {};
    P.map((p, i) => i).sort((a, b) => P[a].rk - P[b].rk).forEach((i, pos) => {
      const g = {};
      grp[i].forEach(x => { g[x] = seen[x] ? 0 : 1; seen[x] = 1; });
      out.set(P[i].key, { win: pos === 0 ? 1 : 0, groups: g });
    });
    return out;
  }
  const { cdf } = strengths(data);
  const seed = P.map(p => p.rtg || 0);
  const hist = P.map(p => p.res.filter(x => x.round <= done && x.opp && x.score != null && idx.has(x.opp)).map(x => ({ j: idx.get(x.opp), s: x.score })));
  const fromRes = P.map(p => p.res.filter(x => x.round <= done && x.score != null).reduce((a, x) => a + x.score, 0));
  const agree = P.filter((p, i) => Math.abs(fromRes[i] - (p.pts || 0)) < 1e-6).length >= n * 0.8;
  const base = Float64Array.from(P.map((p, i) => (agree ? fromRes[i] : (p.pts || 0))));
  const played0 = new Uint8Array(n * n);
  hist.forEach((h, i) => h.forEach(({ j }) => { played0[i * n + j] = played0[j * n + i] = 1; }));
  const byes0 = Uint8Array.from(P.map(p => (p.res.some(x => x.round <= done && x.bye) ? 1 : 0)));
  // the next round as published: fixed results, pairings still to play, byes
  const fixed = [], pend = [], pendBye = [], seen = new Set();
  P.forEach((p, i) => p.res.forEach(x => {
    if (x.round !== done + 1) return;
    if (x.opp && idx.has(x.opp)) {
      const j = idx.get(x.opp), key = Math.min(i, j) * n + Math.max(i, j);
      if (seen.has(key)) return;
      seen.add(key);
      if (x.score != null) fixed.push([i, j, x.score]); else pend.push([i, j]);
    } else if (x.bye && x.score != null) pendBye.push([i, x.score]);
  }));
  const R = new Float64Array(n), pts = new Float64Array(n), played = new Uint8Array(n * n), byes = new Uint8Array(n);
  const oppL = new Array(n), scL = new Array(n), bh = new Float64Array(n), sb = new Float64Array(n), jit = new Float64Array(n);
  const win = new Float64Array(n), gWin = P.map(() => ({}));
  const sample = i => {
    const c = cdf[i], u = Math.random() * c[c.length - 1];
    let lo = 0, hi = c.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (c[mid] < u) lo = mid + 1; else hi = mid; }
    return GRID[lo] + (Math.random() - 0.5) * 20;
  };
  const play = (i, j) => { const o = outcome(R[i], R[j]), u = Math.random(); return u < o[0] ? 1 : (u < o[0] + o[1] ? 0.5 : 0); };
  const record = (i, j, s, addPts) => {
    if (addPts !== false) { pts[i] += s; pts[j] += 1 - s; }
    played[i * n + j] = played[j * n + i] = 1;
    oppL[i].push(j); scL[i].push(s); oppL[j].push(i); scL[j].push(1 - s);
  };
  function swissRound(busy) {
    const free = [];
    for (let i = 0; i < n; i++) if (!busy[i]) free.push(i);
    if (free.length < 2) { free.forEach(i => { pts[i] += 1; byes[i] = 1; }); return; }
    free.sort((a, b) => pts[b] - pts[a] || seed[b] - seed[a] || a - b);
    if (free.length % 2) {                               // bye: lowest-placed player without one
      let k = free.length - 1;
      while (k > 0 && byes[free[k]]) k--;
      const b = free.splice(k, 1)[0];
      pts[b] += 1; byes[b] = 1;
    }
    let i0 = 0, carry = [];
    while (i0 < free.length || carry.length) {
      const grp = [];
      if (i0 < free.length) { const sc = pts[free[i0]]; while (i0 < free.length && pts[free[i0]] === sc) grp.push(free[i0++]); }
      const last = i0 >= free.length, pool = carry.concat(grp);
      carry = [];
      if (pool.length % 2 && !last) carry.push(pool.pop());   // odd group: lowest floats down
      const h = pool.length >> 1, S1 = pool.slice(0, h), S2 = pool.slice(h), used = new Uint8Array(S2.length), left = [];
      for (const a of S1) {                                    // top half against bottom half, no repeats
        let k = -1;
        for (let q = 0; q < S2.length; q++) if (!used[q] && !played[a * n + S2[q]]) { k = q; break; }
        if (k < 0) { left.push(a); continue; }
        used[k] = 1;
        record(a, S2[k], play(a, S2[k]));
      }
      S2.forEach((b, q) => { if (!used[q]) left.push(b); });
      while (left.length) {
        const a = left.shift();
        let k = left.findIndex(b => !played[a * n + b]);
        if (k < 0 && last && left.length) k = 0;
        if (k < 0) { carry.push(a); continue; }
        const b = left.splice(k, 1)[0];
        record(a, b, play(a, b));
      }
      if (last) {
        while (carry.length > 1) { const a = carry.shift(), b = carry.shift(); record(a, b, play(a, b)); }
        break;
      }
    }
  }
  for (let s = 0; s < sims; s++) {
    for (let i = 0; i < n; i++) { R[i] = sample(i); oppL[i] = hist[i].map(x => x.j); scL[i] = hist[i].map(x => x.s); }
    pts.set(base); played.set(played0); byes.set(byes0);
    for (let rd = done + 1; rd <= total; rd++) {
      const busy = new Uint8Array(n);
      if (rd === done + 1) {
        fixed.forEach(([i, j, sc]) => { busy[i] = busy[j] = 1; record(i, j, sc, agree); });
        pend.forEach(([i, j]) => { busy[i] = busy[j] = 1; record(i, j, play(i, j)); });
        pendBye.forEach(([i, sc]) => { busy[i] = 1; if (agree) pts[i] += sc; byes[i] = 1; });   // like the fixed results: the official points already hold it
      }
      swissRound(busy);
    }
    for (let i = 0; i < n; i++) {
      let b = 0, w = 0;
      for (let q = 0; q < oppL[i].length; q++) { const o = pts[oppL[i][q]]; b += o; w += o * scL[i][q]; }
      bh[i] = b; sb[i] = w; jit[i] = Math.random();
    }
    const fin = Array.from({ length: n }, (_, i) => i).sort((a, b) => pts[b] - pts[a] || bh[b] - bh[a] || sb[b] - sb[a] || jit[a] - jit[b]);
    for (let q = 0; q + 1 < n; q++) {                       // two tied players who met: the winner of that game first
      const a = fin[q], b = fin[q + 1];
      if (pts[a] !== pts[b] || (q + 2 < n && pts[fin[q + 2]] === pts[a]) || (q > 0 && pts[fin[q - 1]] === pts[a])) continue;
      let m = 0, met = 0;
      oppL[a].forEach((o, z) => { if (o === b) { m += scL[a][z]; met++; } });
      if (met && m < met / 2) { fin[q] = b; fin[q + 1] = a; }
    }
    win[fin[0]]++;
    const seen = {};
    for (const i of fin) for (const x of grp[i]) if (!seen[x]) { seen[x] = 1; gWin[i][x] = (gWin[i][x] || 0) + 1; }
  }
  P.forEach((p, i) => {
    const g = {};
    grp[i].forEach(x => { g[x] = (gWin[i][x] || 0) / sims; });
    out.set(p.key, { win: win[i] / sims, groups: g });
  });
  return out;
}
function runSims() {
  clearTimeout(simT);
  simT = setTimeout(() => { try { simRes = simulate(S.standings, SIMS); } catch (e) { simRes = null; } renderStandings(); }, 60);
}
