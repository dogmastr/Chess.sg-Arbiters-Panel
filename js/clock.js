/* Clock pane: the big clock, countdown to the next event, and the full-pane announcement. loop() runs every 250 ms (started in main.js). */

function renderStatus(st) {
  const { t, live } = statusOf(st);
  $('statusText').textContent = t;
  $('status').hidden = !t;
  $('status').classList.toggle('live', live);
}
function renderNext(st, sec) {
  const name = $('nextName'), cnt = $('nextIn'), prog = $('prog');
  name.textContent = '';
  if (st.next < 0) {
    name.textContent = st.rs.length ? 'Nothing else scheduled' : '';
    cnt.textContent = '';
    cnt.classList.remove('soon', 'tick'); prog.classList.remove('soon');
    hlPct = 100; $('hlFill').style.width = '100%';
    prog.style.width = st.rs.length ? '100%' : '0';
    return;
  }
  const n = st.rs[st.next];
  const k = document.createElement('span');
  k.className = 'k';
  k.textContent = 'Next  ';
  name.append(k, n.name + ' · ' + fmtMin(n.min));
  const left = n.min * 60 - sec;
  cnt.textContent = fmtDur(left);
  const soon = left <= 60;
  cnt.classList.toggle('soon', soon);
  prog.classList.toggle('soon', soon);
  if (soon && !reduced) { cnt.classList.remove('tick'); void cnt.offsetWidth; cnt.classList.add('tick'); }
  if (st.cur >= 0) {
    const a = st.rs[st.cur].min * 60, b = n.min * 60;
    hlPct = clamp((sec - a) / (b - a) * 100, 0, 100);
    prog.style.width = hlPct + '%';
  } else { hlPct = 0; prog.style.width = '0'; }
  $('hlFill').style.width = hlPct + '%';
}
const digits = Array.from(document.querySelectorAll('#time .d'));
const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function setDigit(el, ch) {
  if (el.dataset.v === ch) return;
  const first = el.dataset.v == null;
  el.dataset.v = ch;
  if (first || reduced || document.hidden) { el.innerHTML = '<span>' + ch + '</span>'; return; }
  const old = el.lastElementChild;
  const n = document.createElement('span');
  n.className = 'in'; n.textContent = ch;
  el.querySelectorAll('.out').forEach(o => o.remove());
  if (old) { old.className = 'out'; setTimeout(() => old.remove(), 650); }
  el.appendChild(n);
}
function renderClock(t) {
  const h = S.h12 ? (t.h % 12 || 12) : t.h;
  const str = pad(h) + pad(t.m) + pad(t.s);
  digits.forEach((d, i) => setDigit(d, str[i]));
  digits[0].hidden = S.h12 && h < 10;
  $('ampm').textContent = S.h12 ? (t.h < 12 ? 'AM' : 'PM') : '';
}
let lastSec = -1;
function loop() {
  const t = nowHMS();
  renderClock(t);
  if (t.sec === lastSec) return;
  lastSec = t.sec;
  const st = scheduleAt(t.sec);
  renderSchedule(st);
  renderStatus(st);
  renderNext(st, t.sec);
  if (prevCur !== null && st.cur !== prevCur && st.cur >= 0 && S.announce && t.sec - st.rs[st.cur].min * 60 < 15) announce(st.rs[st.cur]);
  prevCur = st.cur;
}

/* full-pane announcement when an event starts */
let prevCur = null, flashT1, flashT2;
function announce(r) {
  const el = $('flash');
  $('flashKicker').textContent = r.round ? 'Now starting' : (/^end$/i.test(r.name) ? 'That\'s a wrap' : 'Now');
  $('flashText').textContent = r.round ? 'Round ' + r.round : (/^end$/i.test(r.name) ? 'Thank you!' : r.name);
  clearTimeout(flashT1); clearTimeout(flashT2);
  el.classList.remove('out');
  el.hidden = false;
  el.style.animation = 'none'; $('flashIn').style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = ''; $('flashIn').style.animation = '';
  flashT1 = setTimeout(() => { el.classList.add('out'); flashT2 = setTimeout(() => { el.hidden = true; el.classList.remove('out'); }, 760); }, 7000);
}
$('flash').addEventListener('click', () => { clearTimeout(flashT1); clearTimeout(flashT2); $('flash').hidden = true; });
