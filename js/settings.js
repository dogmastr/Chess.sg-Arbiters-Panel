/* The arbiter page (index.html): settings form, chess-results page picker, backup code, the sidebar's two areas and switching between events.
   Every change is saved at once; the TV page (display.html) follows through the browser's storage event. Keep this file last there. */

const page = $('settings');
function fillForm() {
  page.querySelectorAll('[data-key]').forEach(el => {
    const v = S[el.dataset.key];
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
  });
  renderEditor();
  renderSteps();
  $('set-json').value = JSON.stringify(S);
}
/* save, and bring the parts of this page that mirror the settings up to date. saved: the change came from another window, so it is in storage already */
function applyAll(saved) {
  makeFmt();
  paintTiles();
  renderEvents();
  syncNav();
  syncShow();
  renderWinners();
  if (!saved) save();
  $('set-json').value = JSON.stringify(S);
}
page.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'set-json') return;
  if (el.dataset.key) {
    const k = el.dataset.key;
    if (el.type === 'checkbox') S[k] = el.checked;
    else if (el.type === 'number') { if (el.value === '') return; S[k] = Number(el.value); }
    else S[k] = el.value;
    applyAll();
  } else if (el.dataset.row != null) {
    S.schedule[Number(el.dataset.row)][el.dataset.f] = el.value;
    if (el.dataset.f === 'name') paintDot(el.closest('.ev').querySelector('.dot'), el.value); else refreshLens();
    applyAll();
  }
});
$('btnResetLayout').addEventListener('click', () => { S.layout = clone(DEFAULTS.layout); S.crop = clone(DEFAULTS.crop); applyAll(); });
$('btnCopy').addEventListener('click', () => {
  const ta = $('set-json');
  ta.value = JSON.stringify(S);
  const fallback = () => { ta.select(); $('backupMsg').textContent = 'Selected. Press Ctrl+C to copy.'; };
  try { navigator.clipboard.writeText(ta.value).then(() => { $('backupMsg').textContent = 'Copied.'; }, fallback); }
  catch (e) { fallback(); }
});
$('btnLoad').addEventListener('click', () => {
  try {
    const data = JSON.parse($('set-json').value);
    if (typeof data !== 'object' || !data) throw 0;
    const id = EVENTS[data.eventId] ? data.eventId : S.eventId;
    S = Object.assign(globalPart(data), eventPart(id, data));
    S.eventId = id;
    try { if (hashEvent() && hashEvent() !== id) location.hash = id; } catch (e) {}
    fillForm(); applyAll();
    $('backupMsg').textContent = 'Settings loaded.';
  } catch (e) { $('backupMsg').textContent = 'That code could not be read. Copy the whole code and try again.'; }
});
let resetArmed = false;
$('btnReset').addEventListener('click', e => {
  if (!resetArmed) { resetArmed = true; e.target.textContent = 'Click again to reset'; setTimeout(() => { resetArmed = false; e.target.textContent = 'Reset everything'; }, 4000); return; }
  resetArmed = false; e.target.textContent = 'Reset everything';
  const id = S.eventId;
  S = Object.assign(globalPart(null), eventPart(id, null));
  S.eventId = id;
  clearDesk();
  fillForm(); applyAll();
  $('backupMsg').textContent = 'Back to the original settings for this event.';
});
$('btnReload').addEventListener('click', () => {
  try { localStorage.setItem(KEY + '.reload', String(Date.now())); } catch (e) {}   // the TV page watches for this
  toast('Reloading chess-results on the TV');
});
$('btnPasteOpen').addEventListener('click', openPaste);
$('pasteModal').addEventListener('click', e => {       // the dialog's "Open Starting rank / Crosstable": the page to copy from, in a new tab
  const b = e.target.closest('button[data-open]'), p = crParts(S.resultsUrl);
  if (!b) return;
  if (!p) { toast('Add the chess-results link in Setup first'); return; }
  window.open(crBuild(p, b.dataset.open, 0), '_blank', 'noopener');
});
let stResetArmed = false;
$('btnStReset').addEventListener('click', e => {
  if (!stResetArmed) { stResetArmed = true; e.target.textContent = 'Click again to clear results'; setTimeout(() => { stResetArmed = false; e.target.textContent = 'Clear results'; }, 4000); return; }
  stResetArmed = false; e.target.textContent = 'Clear results';
  S.standings = EVENTS[S.eventId].defaults().standings; applyAll();
});

/* ---------- what the TV shows: chess-results page and Schedule / Prizes / Standings ---------- */
function crParts(url) {
  const m = /^(https?:\/\/[^\/?#]*chess-results\.com)\/tnr(\d+)\.aspx(\?[^#]*)?/i.exec(String(url || '').trim());
  if (!m) return null;
  const q = {};
  new URLSearchParams(m[3] || '').forEach((v, k) => { q[k.toLowerCase()] = v; });
  return { host: m[1], id: m[2], lan: q.lan || '1', art: q.art || '0', rd: Number(q.rd) || 0 };
}
function crBuild(p, art, rd) {
  return p.host + '/tnr' + p.id + '.aspx?lan=' + encodeURIComponent(p.lan) + '&art=' + art + (art === '0' || art === '4' ? '' : '&rd=' + rd);
}
function setResults(url) {
  S.resultsUrl = url;
  $('set-results').value = url;
  applyAll();
}
function syncNav() {
  const p = crParts(S.resultsUrl);
  $('btnReload').disabled = !String(S.resultsUrl || '').trim();
  $('zVal').textContent = S.crop.results.z + '%';
  $('crHint').hidden = !!p;
  $('crNav').hidden = !p;
  if (!p) return;
  document.querySelectorAll('.navseg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.art === p.art)));
  const roundView = p.art === '1' || p.art === '2';
  $('rdStep').hidden = !roundView;
  if (roundView) $('rdLabel').textContent = 'Round ' + (p.rd || 1) + ' / ' + Math.max(maxRound(), p.rd || 1);
}
document.querySelectorAll('.navseg button').forEach(b => b.addEventListener('click', () => {
  const p = crParts(S.resultsUrl); if (!p) return;
  setResults(crBuild(p, b.dataset.art, p.rd || roundNow()));
}));
document.querySelectorAll('.rdstep button').forEach(b => b.addEventListener('click', () => {
  const p = crParts(S.resultsUrl); if (!p) return;
  setResults(crBuild(p, p.art, clamp((p.rd || 1) + Number(b.dataset.step), 1, Math.max(maxRound(), p.rd || 1))));
}));
document.querySelectorAll('.zoom button').forEach(b => b.addEventListener('click', () => {
  const c = S.crop.results;
  c.z = clamp((Number(c.z) || 100) + Number(b.dataset.z), 30, 300);
  applyAll();
}));
function showOnTv(v) { S.infoView = v; if (v === 'rotate') S.rotate.t0 = Date.now(); applyAll(); }   // a rotation starts at its first step
function syncShow() {
  document.querySelectorAll('[data-show]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.show === S.infoView)));
  $('rotBox').hidden = S.infoView !== 'rotate';
}
$('showPick').addEventListener('click', e => { const b = e.target.closest('button[data-show]'); if (b) showOnTv(b.dataset.show); });

/* ---------- rotation: the views the TV steps through, in order, each for some seconds ---------- */
const stepBox = $('rotSteps');
function paintSteps() {                                // when each step starts within the loop, and how long the loop is
  let t = 0;
  S.rotate.steps.forEach((x, i) => { stepBox.children[i].querySelector('.off').textContent = fmtDur(t); t += x.s; });
  $('rotNote').textContent = t ? 'The TV shows each step for its seconds, then the next, and starts over after the last (a full loop takes ' + fmtDur(t) + '). Use ↑ ↓ to change the order.'
    : 'No steps yet: the TV shows the playing schedule until you add one.';
}
function renderSteps() {
  const st = S.rotate.steps;
  stepBox.innerHTML = st.map((x, i) => '<li class="ev"><span class="off"></span><span class="dot round">' + (i + 1) + '</span><div class="card">' +
    '<select class="nm" aria-label="Step ' + (i + 1) + ' shows">' + Object.keys(VIEWS).map(k => '<option value="' + k + '"' + (k === x.v ? ' selected' : '') + '>' + VIEWS[k] + '</option>').join('') + '</select>' +
    '<label class="len"><input type="number" min="1" max="600" step="5" value="' + x.s + '" aria-label="Seconds for step ' + (i + 1) + '"><span>sec</span></label>' +
    '<button class="mv" type="button" data-mv="-1" aria-label="Move step ' + (i + 1) + ' up"' + (i ? '' : ' disabled') + '>↑</button>' +
    '<button class="mv" type="button" data-mv="1" aria-label="Move step ' + (i + 1) + ' down"' + (i < st.length - 1 ? '' : ' disabled') + '>↓</button>' +
    '<button class="del" type="button" aria-label="Remove step ' + (i + 1) + '">×</button></div></li>').join('');
  paintSteps();
}
function stepsSaved() { S.rotate.t0 = Date.now(); applyAll(); }   // any change restarts the loop, so the TV shows step 1 and you see your edit
stepBox.addEventListener('change', e => {
  const i = Array.prototype.indexOf.call(stepBox.children, e.target.closest('li')), x = S.rotate.steps[i];
  if (!x) return;
  if (e.target.tagName === 'SELECT') x.v = e.target.value;
  else { x.s = clamp(Math.round(Number(e.target.value)) || x.s, 1, 600); e.target.value = x.s; }
  paintSteps(); stepsSaved();
});
stepBox.addEventListener('click', e => {
  const b = e.target.closest('button'), st = S.rotate.steps;
  if (!b) return;
  const i = Array.prototype.indexOf.call(stepBox.children, b.closest('li'));
  if (b.dataset.mv) st.splice(i + Number(b.dataset.mv), 0, st.splice(i, 1)[0]); else st.splice(i, 1);
  renderSteps(); stepsSaved();
});
$('rotAdd').addEventListener('click', () => {          // the first view not in the list yet, so a removed one comes back
  const st = S.rotate.steps;
  st.push({ v: Object.keys(VIEWS).find(k => !st.some(x => x.v === k)) || 'schedule', s: 15 });
  renderSteps(); stepsSaved();
});

/* ---------- the tiles along the top: what is on now, what is next, what the TV shows, the standings ---------- */
function paintTiles() {
  const sec = nowHMS().sec, st = scheduleAt(sec), s = statusOf(st), nx = st.next >= 0 ? st.rs[st.next] : null, D = S.standings, rot = S.infoView === 'rotate';
  $('kNow').textContent = s.t || 'No schedule';
  $('kNowSub').textContent = st.cur >= 0 ? 'Since ' + fmtMin(st.rs[st.cur].min) : '';
  $('kNowBox').classList.toggle('live', s.live);
  $('kNext').textContent = nx ? nx.name : st.rs.length ? 'Nothing else' : '—';
  $('kNextSub').textContent = nx ? fmtMin(nx.min) + ' · in ' + fmtDur(nx.min * 60 - sec) : '';
  $('kTv').textContent = rot ? 'Rotating' : VIEWS[S.infoView] || VIEWS.schedule;
  $('kTvSub').textContent = rot ? plural(S.rotate.steps.length, 'step') + ' · ' + fmtDur(S.rotate.steps.reduce((a, x) => a + x.s, 0)) + ' loop' : 'Pinned';
  $('kSt').textContent = D.players.length ? D.players.length + ' players' : 'No players yet';
  $('kStSub').textContent = !D.players.length ? '' : D.source === 'start' ? 'No results yet' : 'After round ' + D.afterRound + (D.source === 'ranking' ? ' · points only' : '');
}
setInterval(paintTiles, 1000);                         // the countdown to the next event

/* ---------- cards: the header minimises a card; which ones are minimised is remembered on this computer (not part of the settings) ---------- */
const CLOSED_KEY = KEY + '.closed', panels = Array.from(document.querySelectorAll('details.panel'));
let closedIds = [];
try { closedIds = JSON.parse(localStorage.getItem(CLOSED_KEY)) || []; } catch (e) {}
panels.forEach(p => {
  p.open = !closedIds.includes(p.id);
  p.addEventListener('toggle', () => {
    try { localStorage.setItem(CLOSED_KEY, JSON.stringify(panels.filter(x => !x.open).map(x => x.id))); } catch (e) {}
  });
});

/* ---------- the sidebar: Main panel or Prizes panel; which one is open is remembered on this computer (not part of the settings) ---------- */
const AREA_KEY = KEY + '.area';
function showArea(a) {
  if (!$('area-' + a)) a = 'main';
  document.querySelectorAll('.area').forEach(x => { x.hidden = x.id !== 'area-' + a; });
  document.querySelectorAll('.side [data-area]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.area === a)));
  page.scrollTop = 0;
  try { localStorage.setItem(AREA_KEY, a); } catch (e) {}
}
document.querySelector('.side nav').addEventListener('click', e => { const b = e.target.closest('[data-area]'); if (b) showArea(b.dataset.area); });
try { showArea(localStorage.getItem(AREA_KEY)); } catch (e) { showArea('main'); }

/* ---------- events ---------- */
function renderEvents() {
  $('evPick').innerHTML = Object.keys(EVENTS).map(id => '<button type="button" data-ev="' + id + '" aria-pressed="' + (id === S.eventId) + '">' + esc(EVENTS[id].label) + '</button>').join('');
}
function switchEvent(id, viaHash) {
  if (!EVENTS[id] || id === S.eventId) return;
  save();                                              // keep the current event as it is
  const ev = eventPart(id, storedEvent(id));
  EVENT_KEYS.forEach(k => { S[k] = ev[k]; });
  S.eventId = id;
  if (!viaHash) { try { if (hashEvent() !== id) location.hash = id; } catch (e) {} }
  fillForm(); applyAll();
  toast('Showing ' + S.title);
}
$('evPick').addEventListener('click', e => { const b = e.target.closest('button[data-ev]'); if (b) switchEvent(b.dataset.ev); });
window.addEventListener('hashchange', () => { const h = hashEvent(); if (h) switchEvent(h, true); });

/* ---------- the TV page ---------- */
let tvWin;
$('btnTv').addEventListener('click', () => {
  if (tvWin && !tvWin.closed) tvWin.focus();           // already open: don't reload it (that would drop its full screen)
  else tvWin = window.open('display.html', 'chessSgTv');
});
/* the TV page saved something (resize, crop, a tab click): take it, so the next save here doesn't undo it. It is not saved again:
   that would send it straight back, and two arbiter tabs open on different events would pass it to and fro without end */
window.addEventListener('storage', e => { if (isSaved(e.key)) { S = load(); fillForm(); applyAll(true); } });

fillForm();
applyAll();
