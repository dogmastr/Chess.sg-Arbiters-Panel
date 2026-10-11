/* Arbiter page, Prizes panel: who wins what. The ranking is the standings pasted on the Main panel; the prizes are the event's awards (events.js).
   What is decided at the prize table (cash instead of a chess set, delivery, PayNow numbers, addresses, players left out) is kept on this
   computer but apart from the settings: it is not in the settings code, and the TV page never reads it. */

/* ---------- who wins what ---------- */
const catOf = p => { const m = /^U0*(\d+)/.exec(String(p.cat || '').toUpperCase().replace(/[\s-]/g, '')); return m ? 'U' + m[1] : p.cat || ''; };   // "U09" and "u 9" are both U9
const mayWin = (p, pr) => (!pr.cat || catOf(p) === pr.cat) && (!pr.unrated || !(p.rtg > 0));
const kindOf = pr => (pr.cat || '') + (pr.unrated ? '*' : '');   // prizes open to the same players are one kind
/* players: in rank order, without the excluded ones. A: the event's awards.
   Returns rows [{ pr, w: the winner or null, skipped: higher-ranked players passed over because they hold a prize of another kind }],
   taken (player key → their prize) and medals [{ p, tier }]: the score medal of each player left without a prize. */
function allocate(players, A) {
  const taken = new Map(), told = new Set();
  const rows = A.prizes.map(pr => {
    const pool = players.filter(p => mayWin(p, pr)), w = pool.find(p => !taken.has(p.key)) || null, kind = kindOf(pr);
    const skipped = (w ? pool.slice(0, pool.indexOf(w)) : pool).filter(p => kindOf(taken.get(p.key)) !== kind && !told.has(kind + '|' + p.key));
    skipped.forEach(p => told.add(kind + '|' + p.key));   // said once per kind: the 2nd and 3rd prize need not repeat it
    if (w) taken.set(w.key, pr);
    return { pr, w, skipped };
  });
  const medals = [];
  players.forEach(p => { const tier = !taken.has(p.key) && A.tiers.find(t => p.pts >= t.min); if (tier) medals.push({ p, tier }); });
  return { rows, taken, medals };
}

/* ---------- decisions at the prize table ---------- */
let desk = null, cur = null, wFilter = 'All';   // cur: the last allocate() result, plus what the redraws need
const deskKey = () => KEY + '.desk.' + S.eventId;
function deskNow() {   // the decisions for the event and chess-results tournament on screen; a different tournament starts clean
  const t = (crParts(S.resultsUrl) || {}).id || '';
  if (desk && desk.ev === S.eventId && desk.t === t) return desk;
  let d = null;
  try { d = JSON.parse(localStorage.getItem(deskKey())); } catch (e) {}
  return (desk = Object.assign({ cash: {}, ship: {}, out: {}, pay: {}, addr: {} }, d && d.t === t ? d : null, { ev: S.eventId, t }));
}
function saveDesk() { try { localStorage.setItem(deskKey(), JSON.stringify(desk)); } catch (e) {} }
function clearDesk() { desk = null; try { localStorage.removeItem(deskKey()); } catch (e) {} }   // "Reset everything" on the Main panel

const short = s => s.replace(' chess set', ' set');
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const flip = (map, k, on = !map[k]) => { if (on) map[k] = 1; else delete map[k]; };
const choiceKey = r => r.pr.label + '|' + r.w.key;
const isCash = r => !!(r.w && r.pr.cash && desk.cash[choiceKey(r)]);
const isShip = r => !!(r.w && r.pr.ship && !isCash(r) && desk.ship[choiceKey(r)]);
const cashSum = () => cur.rows.filter(isCash).reduce((a, r) => a + r.pr.cash, 0);
const handed = r => [r.pr.award].concat(r.pr.items.slice(isCash(r) ? 1 : 0).map(short)).join(' + ');   // what the winner walks away with
const payDigits = v => { const d = String(v || '').replace(/\D/g, ''); return d.length === 10 && d.startsWith('65') ? d.slice(2) : d; };
const payOk = v => /^[89]\d{7}$/.test(payDigits(v));   // a Singapore mobile number, with or without 65 in front
const payFmt = v => payDigits(v).replace(/^(\d{4})/, '$1 ');

/* ---------- drawing ---------- */
const choice = (i, what, on, a, b, label) => '<span class="seg sm" role="group" aria-label="' + esc(label) + '">' + [a, b].map((t, v) =>
  '<button type="button"' + (v ? ' class="alt"' : '') + ' data-i="' + i + '" data-set="' + what + '" data-v="' + v + '" aria-pressed="' + (!!v === on) + '">' + esc(t) + '</button>').join('') + '</span>';
function rowHtml(r, i) {
  const pr = r.pr, w = r.w;
  const mark = pr.place ? '<span class="medal m' + (pr.place > 3 ? 'x' : pr.place) + '">' + pr.place + '</span>' : '<span class="lbl2">' + esc(pr.cat || 'UNR') + '</span>';
  const skip = r.skipped.map(p => '<span class="skip">' + esc(p.name) + ' (rank ' + cur.rank.get(p.key) + ') already has ' + esc(cur.taken.get(p.key).label) + '</span>').join('');
  if (!w) return '<div class="wrow">' + mark + '<span class="who none">' + (cur.live ? 'Not awarded' : 'Not decided yet') + '</span><span></span>' +
    '<span class="sub">' + esc(handed(r)) + (cur.live ? ' · no eligible player left' : '') + '</span>' + skip + '</div>';
  const cash = isCash(r), ship = isShip(r), g = catOf(w), pay = desk.pay[w.key] || '', inp = ' data-i="' + i + '" autocomplete="off" ';
  return '<div class="wrow">' + mark + '<span class="who">' + esc(w.name) + '</span><span class="pt">' + fmtPts(w.pts) + '</span>' +
    '<span class="sub">Rank ' + cur.rank.get(w.key) + (g && !pr.cat ? ' · ' + esc(g) : '') + ' · ' + esc(handed(r)) +
    ' <button class="btn xs" type="button" data-i="' + i + '" data-set="out" title="Leave this player out and work the prizes out again">Exclude</button></span>' +
    (pr.cash || pr.ship ? '<span class="choice">' +
      (pr.cash ? choice(i, 'cash', cash, short(pr.items[0]), '$' + pr.cash + ' cash', 'Prize for ' + w.name) : '') +
      (pr.ship && !cash ? choice(i, 'ship', ship, 'Collect', 'Deliver', 'Collect or deliver for ' + w.name) : '') +
      (cash ? '<input type="tel"' + inp + 'class="' + (pay && !payOk(pay) ? 'bad' : '') + '" placeholder="PayNow number" aria-label="PayNow number for ' + esc(w.name) + '" value="' + esc(pay) + '">' : '') +
      (ship ? '<input type="text"' + inp + 'placeholder="Delivery address" aria-label="Delivery address for ' + esc(w.name) + '" value="' + esc(desk.addr[w.key] || '') + '">' : '') + '</span>' : '') + skip + '</div>';
}
function renderWinners() {
  const A = Object.assign({ prizes: [], tiers: [] }, EVENTS[S.eventId].awards), D = S.standings, d = deskNow();
  const all = ordered(), live = D.source !== 'start' && all.length > 0, total = totalRounds(), outs = all.filter(p => d.out[p.key]);
  cur = Object.assign(allocate(live ? all.filter(p => !d.out[p.key]) : [], A), { A, all, live, rank: new Map(all.map((p, i) => [p.key, p.rk || i + 1])) });
  const R = cur.rows, won = R.filter(r => r.w).length;
  const groups = [...new Set(A.prizes.map(pr => pr.cat).filter(Boolean))], lost = all.filter(p => !groups.includes(catOf(p)));

  $('wEvent').textContent = '· ' + EVENTS[S.eventId].label;
  $('wkRank').textContent = !all.length ? 'No players yet' : !live ? 'No results yet' : D.afterRound < total ? 'After round ' + D.afterRound + ' of ' + total : 'Final ranking';
  $('wkRankSub').textContent = all.length ? plural(all.length, 'player') : '';
  $('wkWon').textContent = live ? won + ' of ' + R.length + ' awarded' : plural(R.length, 'prize');
  $('wkWonSub').textContent = [live && A.tiers.length ? plural(cur.medals.length, 'score medal') : '', outs.length ? outs.length + ' excluded' : ''].filter(Boolean).join(' · ');

  const note = [];   // what to know before trusting the list
  if (!A.prizes.length) note.push('This event has no prizes to hand out yet. Add its awards in js/events.js.');
  else if (!all.length) note.push('No players yet. Paste the Starting rank, then the Crosstable after each round.');
  else if (!live) note.push('No results yet. The prizes follow the standings: paste the Crosstable after each round.');
  else if (D.afterRound < total) note.push('This is the ranking after round ' + D.afterRound + ' of ' + total + ', not the final one, so the prizes may still change.');
  if (groups.length && all.length && lost.length === all.length) note.push('No player has an age group, so the ' + groups.join(', ') + ' prizes cannot be awarded. Paste the Starting rank once to add the age groups.');
  else if (A.allGrouped && lost.length) note.push(plural(lost.length, 'player') + ' in none of the age groups (' + groups.join(', ') + ') can only win the open prizes: ' + lost.map(p => p.name).join('; ') + '.');
  $('wNote').textContent = note.join(' ');
  $('wNote').hidden = !note.length;
  $('wOut').hidden = !outs.length;
  $('wOut').innerHTML = 'Excluded from prizes:' + outs.map(p => '<span>' + esc(p.name) + ' <button class="btn xs" type="button" data-out="' + esc(p.key) + '">Undo</button></span>').join('');
  $('wCopy').disabled = !live;

  const cards = new Map();   // the prizes box by box; a box with a single prize is the top prize
  R.forEach((r, i) => { if (!cards.has(r.pr.card)) cards.set(r.pr.card, []); cards.get(r.pr.card).push(i); });
  $('wCards').innerHTML = [...cards].map(([title, ix]) => {
    const p0 = R[ix[0]].pr, same = ix.every(i => kindOf(R[i].pr) === kindOf(p0));
    return '<section class="wcard' + (ix.length === 1 ? ' top' : '') + '"><h3>' + esc(title) + (same ? '<span>' + plural(all.filter(p => mayWin(p, p0)).length, 'player') + '</span>' : '') + '</h3>' +
      ix.map(i => rowHtml(R[i], i)).join('') + '</section>';
  }).join('');

  $('p-medals').hidden = !A.tiers.length;
  $('wTiers').innerHTML = A.tiers.map(t => {
    const list = cur.medals.filter(m => m.tier === t);
    return '<section class="wcard"><h3>' + esc(t.name) + '<span>' + t.min + '+ pts · ' + list.length + '</span></h3><ul class="wlist">' +
      (list.map(m => '<li><span>' + esc(m.p.name) + ' <small>' + esc(catOf(m.p)) + '</small></span><b>' + fmtPts(m.p.pts) + '</b></li>').join('') || '<li><small>' + (live ? 'None' : 'Not decided yet') + '</small></li>') + '</ul></section>';
  }).join('');

  const count = {}, add = (k, n) => { count[k] = (count[k] || 0) + n; };
  R.forEach(r => add(r.pr.award, r.w ? 1 : 0));   // trophies and medals first, then what goes with them
  R.forEach(r => r.pr.items.forEach((it, k) => add(it, r.w && !(k === 0 && isCash(r)) ? 1 : 0)));
  A.tiers.forEach(t => add(t.name + ' medal', cur.medals.filter(m => m.tier === t).length));
  if (A.tiers.length) add('Chess keychain', cur.medals.length);
  $('wCount').innerHTML = Object.keys(count).map(k => '<li><span>' + esc(k) + '</span><b>' + count[k] + '</b></li>').join('');

  const unr = A.prizes.some(pr => pr.unrated), filters = ['All', ...groups, ...(unr ? ['Unrated'] : []), 'Prize winners'];
  if (!filters.includes(wFilter)) wFilter = 'All';
  $('wFilt').innerHTML = filters.map(f => '<button type="button" data-f="' + esc(f) + '" aria-pressed="' + (f === wFilter) + '">' + esc(f) + '</button>').join('');
  const tierOf = new Map(cur.medals.map(m => [m.p.key, m.tier.name]));
  const shown = all.filter(p => wFilter === 'All' || (wFilter === 'Prize winners' ? cur.taken.has(p.key) : wFilter === 'Unrated' ? !(p.rtg > 0) : catOf(p) === wFilter));
  $('wTable').innerHTML = '<thead><tr><th class="r">#</th><th>Player</th><th class="r">Pts</th><th>Award</th><th></th></tr></thead><tbody>' + (shown.map(p => {
    const x = !!d.out[p.key], pr = cur.taken.get(p.key), t = tierOf.get(p.key);
    return '<tr' + (x ? ' class="out"' : '') + '><td class="r">' + cur.rank.get(p.key) + '</td><td class="nm">' + esc(p.name) +
      ' <small>' + esc([catOf(p), p.rtg > 0 ? p.rtg : unr ? 'unrated' : ''].filter(Boolean).join(' · ')) + '</small></td><td class="r">' + fmtPts(p.pts) + '</td><td>' +   // what decides which prizes a player may win
      (x ? '<span class="lbl2 bad">Excluded</span>' : pr ? '<span class="lbl2 gold">' + esc(pr.label) + '</span>' : t ? '<span class="lbl2">' + esc(t) + '</span>' : '') +
      '</td><td class="r"><button class="btn xs" type="button" data-out="' + esc(p.key) + '">' + (x ? 'Include' : 'Exclude') + '</button></td></tr>';
  }).join('') || '<tr><td colspan="5">No players to show.</td></tr>') + '</tbody>';
  paintMoney();
}
/* the parts that follow the PayNow numbers and addresses as they are typed (the winner rows are left alone, so the cursor stays put) */
function paintMoney() {
  const cashers = cur.rows.filter(isCash), ships = cur.rows.filter(isShip);
  const noPay = cashers.filter(r => !payOk(desk.pay[r.w.key])).length, noAddr = ships.filter(r => !(desk.addr[r.w.key] || '').trim()).length;
  $('wkCash').textContent = '$' + cashSum();
  $('wkCashSub').textContent = cashers.length ? plural(cashers.length, 'winner') + ' · ' + (noPay ? plural(noPay, 'number') + ' missing' : 'all numbers in') : 'No cash chosen';
  $('wkShip').textContent = ships.length;
  $('wkShipSub').textContent = ships.length ? (noAddr ? noAddr + ' without an address' : 'All addresses in') : 'Nothing to deliver';
  $('wCopyCash').disabled = !cashers.length;
  $('wCopyShip').disabled = !ships.length;
  const copy = v => ' <button class="btn xs" type="button" data-copy="' + esc(v) + '">Copy</button>';
  $('wCash').innerHTML = cashers.length ? '<div class="wscroll"><table class="wtable"><thead><tr><th>Player</th><th>Prize</th><th class="r">Amount</th><th>PayNow</th></tr></thead><tbody>' + cashers.map(r => {
    const v = desk.pay[r.w.key];
    return '<tr><td>' + esc(r.w.name) + '</td><td>' + esc(r.pr.label) + '</td><td class="r">$' + r.pr.cash + '</td><td>' +
      (!v ? '<span class="miss">Not entered</span>' : payOk(v) ? payFmt(v) + copy(payDigits(v)) : '<span class="miss">' + esc(v) + ' · check the number</span>') + '</td></tr>';
  }).join('') + '</tbody><tfoot><tr><td colspan="2">Total</td><td class="r">$' + cashSum() + '</td><td></td></tr></tfoot></table></div>'
    : '<p class="note">Nobody has chosen cash. Switch a winner to cash on their prize above.</p>';
  $('wShip').innerHTML = ships.length ? '<div class="wscroll"><table class="wtable"><thead><tr><th>Player</th><th>Prize</th><th>Address</th></tr></thead><tbody>' + ships.map(r => {
    const a = (desk.addr[r.w.key] || '').trim();
    return '<tr><td>' + esc(r.w.name) + '</td><td>' + esc(r.pr.label) + ' <small>' + esc(r.pr.items.map(short).join(' + ')) + '</small></td><td>' + (a ? esc(a) + copy(a) : '<span class="miss">Not entered</span>') + '</td></tr>';
  }).join('') + '</tbody></table></div>'
    : '<p class="note">Nothing to deliver. Switch a winner to Deliver on their prize above.</p>';
}

/* ---------- text to copy ---------- */
function winnersText() {
  const L = [S.title + ' — prize winners', ''];
  cur.rows.forEach(r => L.push(r.pr.label + ': ' + (r.w ? r.w.name + ' (' + fmtPts(r.w.pts) + ')' + (isCash(r) ? ' — $' + r.pr.cash + ' cash' : '') + (isShip(r) ? ' — delivery' : '') : 'not awarded')));
  if (cashSum()) L.push('', 'Cash to pay out: $' + cashSum());
  cur.A.tiers.forEach(t => L.push('', t.name + ' (' + t.min + '+ pts): ' + (cur.medals.filter(m => m.tier === t).map(m => m.p.name).join('; ') || 'none')));
  return L.join('\n');
}
function cashText() {
  return ['Cash payouts — ' + S.title, ''].concat(cur.rows.filter(isCash).map(r => {
    const v = desk.pay[r.w.key];
    return r.w.name + ' · ' + r.pr.label + ' · $' + r.pr.cash + ' · PayNow ' + (!v ? 'not entered' : payOk(v) ? payFmt(v) : v);
  }), '', 'Total $' + cashSum()).join('\n');
}
function shipText() {
  return ['Deliveries — ' + S.title, ''].concat(cur.rows.filter(isShip).map(r =>
    r.w.name + ' · ' + r.pr.label + ' · ' + r.pr.items.map(short).join(' + ') + ' · ' + ((desk.addr[r.w.key] || '').trim() || 'address not entered'))).join('\n');
}
function copyOut(text, done) {
  const no = () => toast('Could not copy: the browser did not allow it.');
  try { navigator.clipboard.writeText(text).then(() => toast(done), no); } catch (e) { no(); }
}

/* ---------- clicks and typing ---------- */
$('area-prizes').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || !cur) return;
  const d = b.dataset, r = cur.rows[d.i];
  if (b.id === 'wPaste') return openPaste();
  if (b.id === 'wCopy') return copyOut(winnersText(), 'Winners list copied');
  if (b.id === 'wCopyCash') return copyOut(cashText(), 'Payouts copied');
  if (b.id === 'wCopyShip') return copyOut(shipText(), 'Deliveries copied');
  if (d.copy != null) return copyOut(d.copy, 'Copied');
  let again = '#' + b.closest('[id]').id + ' ' + Object.keys(d).map(k => '[data-' + k + '="' + CSS.escape(d[k]) + '"]').join('');   // the same button after the redraw
  if (d.f) wFilter = d.f;
  else if (d.out != null) flip(desk.out, d.out);
  else if (d.set === 'out') flip(desk.out, r.w.key);
  else if (d.set) { flip(desk[d.set], choiceKey(r), d.v === '1'); if (d.v === '1') again = '#wCards input[data-i="' + d.i + '"]'; }   // straight on to the PayNow number or the address
  else return;
  saveDesk(); renderWinners();
  const el = document.querySelector(again);
  if (el) el.focus();
});
$('area-prizes').addEventListener('input', e => {
  const el = e.target, r = cur && cur.rows[el.dataset.i];
  if (!r || !r.w) return;
  const pay = el.type === 'tel', map = pay ? desk.pay : desk.addr, v = el.value.trim();
  if (v) map[r.w.key] = v; else delete map[r.w.key];
  if (pay) el.classList.toggle('bad', !!v && !payOk(v));
  saveDesk(); paintMoney();
});
