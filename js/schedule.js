/* Time helpers and the playing schedule (the list, the current event, the next one). */

/* ---------- time helpers ---------- */
let fmt;
function makeFmt() {
  try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: S.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }); }
  catch (e) { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }); }
}
function nowHMS() {
  const p = {};
  fmt.formatToParts(new Date(Date.now() + (Number(S.offsetSec) || 0) * 1000)).forEach(x => { p[x.type] = x.value; });
  const h = Number(p.hour) % 24, m = Number(p.minute), s = Number(p.second);
  return { h, m, s, sec: h * 3600 + m * 60 + s };
}
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
function fmtMin(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!S.h12) return pad(h) + ':' + pad(m);
  return (h % 12 || 12) + ':' + pad(m) + (h < 12 ? ' am' : ' pm');
}
function fmtMinHTML(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!S.h12) return pad(h) + ':' + pad(m);
  return (h % 12 || 12) + ':' + pad(m) + '<small>' + (h < 12 ? 'am' : 'pm') + '</small>';
}
function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return h ? h + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
}

/* ---------- schedule ---------- */
const roundOf = name => { const m = /\bround\s*(\d+)/i.exec(name || ''); return m ? Number(m[1]) : 0; };
function rows() {
  return S.schedule
    .filter(r => /^\d{1,2}:\d{2}$/.test(r.time || '') && (r.name || '').trim())
    .map(r => ({ name: r.name.trim(), min: toMin(r.time), round: roundOf(r.name) }))
    .sort((a, b) => a.min - b.min);
}
function scheduleAt(sec) {
  const rs = rows();
  let cur = -1;
  rs.forEach((r, i) => { if (r.min * 60 <= sec) cur = i; });
  return { rs, cur, next: cur + 1 < rs.length ? cur + 1 : -1 };
}
/* the status line for a schedule state: { t: text, live: a round is in play }. Shown on the clock pane and in the arbiter's tiles. */
function statusOf(st) {
  if (!st.rs.length) return { t: '', live: false };
  if (st.cur < 0) return { t: 'Starts ' + fmtMin(st.rs[0].min), live: false };
  const r = st.rs[st.cur];
  if (r.round) return { t: 'Round ' + r.round + ' in play', live: true };
  return { t: st.next < 0 && /^end$/i.test(r.name) ? 'Finished' : r.name, live: false };
}
let schedKey = '';
function renderSchedule(st) {
  const key = JSON.stringify([st.rs, st.cur, S.h12]);
  if (key === schedKey) return;
  schedKey = key;
  const last = st.rs.length - 1;
  const finished = st.cur === last && last >= 0 && /^end$/i.test(st.rs[last].name);
  $('schedList').innerHTML = st.rs.length ? st.rs.map((r, i) => {
    let cls = '', tag = '';
    if (i < st.cur || (finished && i === st.cur)) cls = 'done';
    else if (i === st.cur) { cls = 'now'; tag = r.round ? '<i></i>In play' : 'Now'; }
    else if (i === st.next) { cls = 'next'; tag = 'Next'; }
    return '<li class="stag ' + cls + '" style="--i:' + i + '"><span class="tm">' + fmtMinHTML(r.min) + '</span><span class="ev">' + esc(r.name) + '</span>' +
      (tag ? '<span class="tag">' + tag + '</span>' : '<span></span>') + '</li>';
  }).join('') : '<li class="none">Add events in Settings.</li>';
  [$('hlFill'), $('prog')].forEach(f => { f.style.transition = 'none'; f.style.width = '0%'; void f.offsetWidth; f.style.transition = ''; });
  placeHl();
}

/* gliding highlight behind the current event, filling as it runs */
let hlPct = 0;
function placeHl() {
  const hl = $('hl'), li = document.querySelector('#schedList li.now');
  if (!li || $('viewSchedule').hidden) { hl.style.opacity = '0'; return; }
  const first = hl.style.opacity !== '1';
  if (first) hl.style.transition = 'none';
  hl.style.transform = 'translateY(' + li.offsetTop + 'px)';
  hl.style.height = li.offsetHeight + 'px';
  hl.style.opacity = '1';
  if (first) { void hl.offsetWidth; hl.style.transition = ''; }
  $('hlFill').style.width = hlPct + '%';
}
if ($('swrap') && 'ResizeObserver' in window) new ResizeObserver(placeHl).observe($('swrap'));   // the arbiter page loads this file for the time helpers but has no list

/* ---------- rounds ---------- */
function maxRound() { return Math.max(1, ...rows().map(r => r.round)); }
function totalRounds() { return Math.max(S.standings.totalRounds || 0, maxRound()); }   // what the pasted page said, or the schedule's last round if that is more
function roundNow() {
  const st = scheduleAt(nowHMS().sec);
  const played = st.rs.slice(0, st.cur + 1).filter(r => r.round);
  return played.length ? played[played.length - 1].round : 1;
}
function roundsFinished() {
  const st = scheduleAt(nowHMS().sec);
  const started = st.rs.slice(0, st.cur + 1).filter(r => r.round);
  if (!started.length) return 0;
  const cur = st.rs[st.cur];
  return cur && cur.round ? started.length - 1 : started.length;
}
