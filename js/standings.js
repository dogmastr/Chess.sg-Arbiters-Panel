/* Standings tab: ranked table with win chances, age-group filter and leader cards. */

const fmtPct = v => v == null ? '–' : (v >= 0.995 ? '100%' : (v > 0 && v < 0.01 ? '<1%' : Math.round(v * 100) + '%'));
const shortName = n => String(n).replace(/\s*,\s*/, ' ');
function categories() {   // age groups, oldest first, plus Unrated for events that award it
  const c = [...new Set(S.standings.players.map(p => p.cat).filter(Boolean))].sort((a, b) => (parseInt(b.replace(/\D/g, '')) || 0) - (parseInt(a.replace(/\D/g, '')) || 0));
  if (S.unratedGroup && S.standings.players.some(p => !(p.rtg > 0))) c.unshift('Unrated');
  return c;
}
const inGroup = (p, g) => (g === 'Unrated' ? !(p.rtg > 0) : p.cat === g);
function groupsOf(p) { const g = []; if (p.cat) g.push(p.cat); if (S.unratedGroup && !(p.rtg > 0) && p.cat !== 'Unrated') g.push('Unrated'); return g; }
const groupPct = (pr, g) => (pr ? (pr.groups && pr.groups[g]) || 0 : null);
function bar(v) {
  const w = v == null ? 0 : Math.max(v > 0 ? 2 : 0, Math.round(v * 100));
  return '<span class="pbar"><i><b style="width:' + w + '%"></b></i><em>' + fmtPct(v) + '</em></span>';
}
function renderStandings() {
  const D = S.standings, all = ordered(), cats = categories();
  $('stand').classList.toggle('none', !all.length);
  if (!all.length) {
    $('stMetaText').textContent = 'No players yet';
    $('stFilt').innerHTML = ''; $('stLeaders').innerHTML = ''; $('stMore').textContent = '';
    $('stRows').innerHTML = '<div class="stempty"><strong>No players yet</strong><span>On the arbiter page, choose Paste new standings. Paste the Starting rank first, then the Crosstable after each round.</span></div>';
    return;
  }
  if (S.stFilter !== 'All' && !cats.includes(S.stFilter)) S.stFilter = 'All';
  const F = S.stFilter, isCat = F !== 'All';
  $('stand').classList.toggle('cat', isCat);
  $('stFilt').innerHTML = ['All', ...cats].map(c => '<button type="button" data-f="' + esc(c) + '" aria-pressed="' + (c === F) + '">' + (c === 'All' ? 'All players' : esc(c)) + '</button>').join('');
  $('stPctHead').textContent = isCat ? F + ' win chance' : 'Win chance';
  const t = D.updated ? new Date(D.updated) : null;
  const when = t ? (sameDay(D.updated) ? fmtMin(t.getHours() * 60 + t.getMinutes()) : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) : '';
  $('stMetaText').textContent = D.source === 'start' ? 'No results yet' : 'After Rd ' + D.afterRound + (when ? ' · ' + when : '') + (D.source === 'ranking' ? ' · points only' : '');
  const list = isCat ? all.filter(p => inGroup(p, F)) : all;
  const MAX = 13, shown = list.slice(0, MAX);
  const noRes = D.source === 'start';
  $('stRows').style.setProperty('--n', MAX);
  $('stRows').innerHTML = shown.map((p, i) => {
    const pr = simRes ? simRes.get(p.key) : null;
    const pos = isCat ? i + 1 : (noRes ? i + 1 : p.rk || i + 1);
    return '<div class="str stag' + (i === 0 && !noRes ? ' top' : '') + '" style="--i:' + i + '"><span class="rk">' + pos + '</span><span class="nm">' + esc(shortName(p.name)) + '</span><span class="cc">' + (p.cat ? '<span>' + esc(p.cat) + '</span>' : '') + '</span><span class="pt">' + fmtPts(p.pts) + '</span>' + bar(pr ? (isCat ? groupPct(pr, F) : pr.win) : null) + '</div>';
  }).join('');
  $('stMore').textContent = list.length > MAX ? '+ ' + (list.length - MAX) + ' more' + (isCat ? '' : ' · use the age-group buttons to see everyone') : '';
  // leaders
  const champ = all[0], cp = simRes ? simRes.get(champ.key) : null;
  let html = '';
  if (champ) {
    html += '<div class="lchamp stag" style="--i:0">' + TROPHY + '<div style="min-width:0"><div class="k">' + (noRes ? 'Top seed' : 'Overall leader') + '</div><div class="nm">' + esc(shortName(champ.name)) + '</div></div>' +
      '<div class="pc"><b>' + (noRes ? (champ.rtg || '—') : fmtPts(champ.pts) + ' pts') + '</b><small>' + (cp ? fmtPct(cp.win) + ' win chance' : '') + '</small></div></div>';
  }
  let k = 1;
  const per = cats.length > 3 ? 2 : 3;   // keep the column on screen when there are many groups
  cats.forEach(c => {
    const ps = all.filter(p => inGroup(p, c)).slice(0, per);
    if (!ps.length) return;
    html += '<div class="lcard stag" style="--i:' + (k++) + '"><h4>' + esc(c) + '<span>' + esc(c) + ' win chance</span></h4>' + ps.map((p, i) => {
      const pr = simRes ? simRes.get(p.key) : null;
      return '<div class="lrow"><span class="medal m' + (i + 1) + '">' + (i + 1) + '</span><span class="nm">' + esc(shortName(p.name)) + '</span><span class="pt">' + (noRes ? (p.rtg ? p.rtg : '') : fmtPts(p.pts)) + '</span><span class="pc">' + (pr ? fmtPct(groupPct(pr, c)) : '') + '</span></div>';
    }).join('') + '</div>';
  });
  html += '<div class="lnote">' + (D.source === 'ranking' ? 'Only points were pasted, so these chances are rough. Paste the Crosstable page for better ones.' : 'Win chances come from 6,000 simulated finishes, using ratings, results so far and the published pairings.') + '</div>';
  $('stLeaders').innerHTML = html;
}
$('stFilt').addEventListener('click', e => {
  const b = e.target.closest('button[data-f]'); if (!b) return;
  S.stFilter = b.dataset.f; save();
  renderStandings();
  const v = $('viewStandings'); v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
  clearTimeout(enterT); enterT = setTimeout(() => v.classList.remove('enter'), 1800);
});
