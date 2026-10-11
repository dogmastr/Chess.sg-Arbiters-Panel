/* Getting standings in (arbiter page): the paste dialog, Ctrl+V anywhere on the page, and applying the pasted table to the saved standings. */

function pasteSummary(res) {
  if (!res.hasPts) return 'Updated age groups and ratings';
  const a = res.after != null ? res.after : roundsFinished();
  if (res.games > 0 || a === 0) return 'Standings updated after round ' + a + (res.games ? ' · ' + res.games + ' games read' : '');
  return 'Standings updated after round ' + a + ', points only: no game results found. For better win chances, copy the Crosstable page.';
}
function applyParsed(res) {
  const old = new Map(S.standings.players.map(p => [p.key, p]));
  if (!res.hasPts) {
    if (S.standings.source === 'start' || !S.standings.players.length || !sameDay(S.standings.updated)) {   // no results yet, or results from an earlier day: this becomes the player list
      const players = res.players.map((p, i) => ({ name: p.name, key: p.key, fed: p.fed || '', rtg: p.rtg || 0, cat: p.typ || '', pts: 0, rk: p.sno || i + 1, res: [] }));
      S.standings = { source: 'start', afterRound: 0, games: 0, totalRounds: res.total || 0, updated: Date.now(), players };
      const nc = new Set(players.map(p => p.cat).filter(Boolean)).size;
      return 'Starting list loaded: ' + players.length + ' players' + (nc ? ' in ' + nc + ' age groups' : '');
    }
    let n = 0;   // results already in: only refresh ratings and age groups
    res.players.forEach(p => { const o = old.get(p.key); if (o) { if (p.typ != null && p.typ !== '') o.cat = p.typ; if (p.rtg != null) o.rtg = p.rtg; n++; } });
    return 'Updated age groups and ratings for ' + n + ' players';
  }
  const players = res.players.map(p => {
    const o = old.get(p.key) || {};
    return { name: p.name, key: p.key, fed: p.fed || o.fed || '', rtg: p.rtg != null ? p.rtg : (o.rtg || 0), cat: p.typ != null && p.typ !== '' ? p.typ : (o.cat || ''), pts: p.pts || 0, rk: p.rk, tbs: p.tbs, res: p.res };
  });
  const after = res.after != null ? res.after : roundsFinished();
  S.standings = { source: res.games > 0 ? 'crosstable' : 'ranking', afterRound: after, games: res.games || 0, totalRounds: res.total || 0, updated: Date.now(), players };
  return pasteSummary(res) + (players.some(p => p.cat) ? '' : ' Paste the Starting rank once to add age groups.');
}

function takePaste(text) {
  const res = parseChessResults(text);
  if (res.error) return { ok: false, msg: res.error };
  const msg = applyParsed(res);
  applyAll();                                          // saves; the TV page redraws and re-runs the win chances
  return { ok: true, msg };
}
let pending = null;
function openPaste() {
  $('pasteBox').value = ''; $('pasteMsg').textContent = ''; $('pasteMsg').className = 'msg'; $('pasteOk').disabled = true; pending = null;
  $('pasteModal').hidden = false; $('pasteBox').focus();
}
function closePaste() { $('pasteModal').hidden = true; }
$('pasteBox').addEventListener('input', () => {
  const res = parseChessResults($('pasteBox').value);
  const m = $('pasteMsg');
  if (!$('pasteBox').value.trim()) { m.textContent = ''; m.className = 'msg'; $('pasteOk').disabled = true; return; }
  if (res.error) { m.textContent = res.error; m.className = 'msg bad'; $('pasteOk').disabled = true; return; }
  const pointsOnly = res.hasPts && !res.games && res.after > 0;
  m.textContent = 'Found ' + res.players.length + ' players' + (res.hasPts ? (res.after != null ? ', results after round ' + res.after : '') + (res.games ? ', ' + res.games + ' games' : '') : ' (starting list: updates age groups and ratings)') + '.' + (pointsOnly ? ' No game results found, so win chances will be rough. The Crosstable page gives better ones.' : '');
  m.className = pointsOnly ? 'msg bad' : 'msg ok'; $('pasteOk').disabled = false;
});
$('pasteOk').addEventListener('click', () => { const r = takePaste($('pasteBox').value); closePaste(); toast(r.msg); if (S.infoView !== 'rotate') showOnTv('standings'); });
$('pasteCancel').addEventListener('click', closePaste);

$('pasteModal').addEventListener('click', e => { if (e.target.id === 'pasteModal') closePaste(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('pasteModal').hidden) closePaste(); });
document.addEventListener('paste', e => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (['input', 'textarea'].includes(tag)) return;
  const text = (e.clipboardData || window.clipboardData).getData('text');
  if (!text) return;
  e.preventDefault();
  if (!$('pasteModal').hidden) {                       // the dialog is open but the cursor is not in its box (after "Open Crosstable", say): fill the box
    $('pasteBox').value = text; $('pasteBox').dispatchEvent(new Event('input')); $('pasteBox').focus();
    return;
  }
  const r = takePaste(text);
  toast(r.msg);
  if (r.ok && S.infoView !== 'rotate') showOnTv('standings');   // a rotation already comes round to the standings
});
