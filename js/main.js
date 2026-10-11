/* Starts the TV page (display.html). Keep this file last there. */

function applyAll() {
  $('tTitle').textContent = S.title;
  makeFmt();
  applyPage();
  applyGrid();
  layoutPane();
  renderPrizes();
  renderStandings();
  setView(S.infoView, false, false);
  lastSec = -1;
  loop();
}

/* ---------- the arbiter page saved something: show it here ---------- */
window.addEventListener('storage', e => {
  if (e.key === KEY + '.reload') { reloadResults(); return; }   // "Reload" on the arbiter page
  if (!isSaved(e.key)) return;
  const sig = () => JSON.stringify([S.eventId, S.standings, S.unratedRtg, totalRounds()]), before = sig();   // what the win chances are worked out from
  S = load();
  prevCur = null;                                      // an edit must not replay the round announcement
  applyAll();
  if (sig() !== before) { simRes = null; runSims(); }
});

/* ---------- full screen, keys, idle, wake lock ---------- */
function toggleFs() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  } catch (e) {}
}
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'f') toggleFs();
  else if (k === '1') setView('schedule', true);
  else if (k === '2') setView('prizes', true);
  else if (k === '3') setView('standings', true);
  else if (k === '4') setView('rotate', true);
});
let idleT;
function wake() { app.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => { app.classList.add('idle'); }, 3000); }
['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, wake, { passive: true }));
wake();
async function keepAwake() {
  try { if ('wakeLock' in navigator && document.visibilityState === 'visible') await navigator.wakeLock.request('screen'); } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
keepAwake();

applyAll();
setView(S.infoView, false, true);
runSims();
setInterval(loop, 250);
setInterval(tickView, 250);                            // steps the rotation on (cheap when it is off)
