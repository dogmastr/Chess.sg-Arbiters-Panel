/* The Schedule / Prizes / Standings views of the top-right pane. The arbiter page picks one, or "rotate": the TV then steps through
   S.rotate.steps in a loop. Where the loop is up to is worked out from the clock (time since S.rotate.t0), so a reload,
   or a save from either page, never throws it off. */

let enterT, shown;
function showView(V, animate) {
  $('viewSchedule').hidden = V !== 'schedule';
  $('viewPrizes').hidden = V !== 'prizes';
  $('viewStandings').hidden = V !== 'standings';
  $('iTitle').textContent = VIEWS[V];
  $('iTitle').hidden = V === 'prizes';                 // the prize list already opens with "Prize fund"
  $('prizeFund').hidden = V !== 'prizes';
  $('stMeta').hidden = V !== 'standings';
  if (animate || V !== shown) {
    const view = { schedule: $('viewSchedule'), prizes: $('viewPrizes'), standings: $('viewStandings') }[V];
    document.querySelectorAll('.view').forEach(x => x.classList.remove('enter'));
    void view.offsetWidth;
    view.classList.add('enter');
    clearTimeout(enterT);
    enterT = setTimeout(() => view.classList.remove('enter'), 1800);
  }
  shown = V;
  if (V === 'schedule') placeHl();
}

/* the step the rotation is in now: { v: view, dur: its length in seconds, at: seconds into it }, or null with no steps */
function rotStep() {
  const st = S.rotate.steps, total = st.reduce((a, x) => a + x.s, 0);
  if (!total) return null;
  let t = ((Date.now() - S.rotate.t0) / 1000 % total + total) % total, i = 0;
  while (i < st.length - 1 && t >= st[i].s) t -= st[i++].s;
  return { v: st[i].v, dur: st[i].s, at: t };
}
/* show what the pane should show now, and fill the progress line under it. Called by setView and every 250 ms (main.js). */
let lastP = 0;
function tickView(animate) {
  const st = S.infoView === 'rotate' ? rotStep() : null;
  const V = st ? st.v : isView(S.infoView) ? S.infoView : 'schedule';
  if (animate || V !== shown) showView(V, animate);
  $('rotBar').hidden = !st;
  if (!st) return;
  const f = $('rotFill'), p = st.at / st.dur;
  if (p < lastP) { f.style.transition = 'none'; f.style.transform = 'scaleX(0)'; void f.offsetWidth; f.style.transition = ''; }   // a new step: restart without sliding back
  f.style.transform = 'scaleX(' + p + ')';
  lastP = p;
}
function setView(v, persist, animate) {
  S.infoView = isView(v) || v === 'rotate' ? v : 'schedule';
  tickView(animate);
  if (persist) save();
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeHl);
