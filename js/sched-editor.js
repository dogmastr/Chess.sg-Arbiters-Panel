/* Arbiter page: the playing schedule editor, a timeline of event cards.
   Drag a card's grip (or use the arrow keys on it) to reorder; click + on the line between two events to add one there;
   change an event's length to move everything after it. Events are kept in time order. Moving an event keeps every
   event's length, so only the times between its old and new place change. */

const box = $('schedEdit');
const LEN = 15;                                        // length of an event added between two others, in minutes

const minOf = r => (/^\d{1,2}:\d{2}$/.test((r && r.time) || '') ? toMin(r.time) : NaN);
const hhmm = m => { m = clamp(Math.round(m), 0, 1439); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
const byTime = (a, b) => (isNaN(minOf(a)) - isNaN(minOf(b))) || (minOf(a) - minOf(b)) || 0;   // events without a valid time go last
const indexOfRow = li => Array.prototype.indexOf.call(box.children, li);
function shiftFrom(i, d) { S.schedule.slice(i).forEach(r => { const m = minOf(r); if (!isNaN(m)) r.time = hhmm(m + d); }); }

/* ---------- reset ---------- */
$('btnSchedReset').addEventListener('click', () => {   // back to this event's built-in schedule
  if (!confirm('Reset the playing schedule to its original times and events?')) return;
  S.schedule = EVENTS[S.eventId].defaults().schedule;
  renderEditor(); applyAll();
});

/* ---------- drawing ---------- */
function paintDot(dot, name) { const n = roundOf(name); dot.textContent = n || ''; dot.classList.toggle('round', !!n); }
function refreshLens() {                               // each event's length = time until the next event
  const rs = S.schedule;
  box.querySelectorAll('.len input').forEach((inp, i) => {
    const d = i < rs.length - 1 ? minOf(rs[i + 1]) - minOf(rs[i]) : NaN;
    inp.disabled = !(d >= 0);
    if (inp !== document.activeElement) inp.value = d >= 0 ? d : '';
  });
}
const GRIP = '<svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true"><g fill="currentColor"><circle cx="2.5" cy="3" r="1.4"/><circle cx="7.5" cy="3" r="1.4"/><circle cx="2.5" cy="8" r="1.4"/><circle cx="7.5" cy="8" r="1.4"/><circle cx="2.5" cy="13" r="1.4"/><circle cx="7.5" cy="13" r="1.4"/></g></svg>';
/* hit: the event to highlight; focus: which of its fields to focus ('name', 'time' or 'grip') */
function renderEditor(hit, focus) {
  const rs = S.schedule;
  rs.sort(byTime);
  box.innerHTML = '';
  rs.forEach((r, i) => {
    const li = document.createElement('li');
    li.className = 'ev';
    li.innerHTML = '<input class="tm" type="time"><span class="dot"></span><div class="card">' +
      '<button class="grip" type="button" title="Drag to move">' + GRIP + '</button>' +
      '<input class="nm" type="text"><label class="len"><input type="number" min="0" max="900" step="5"><span>min</span></label>' +
      '<button class="del" type="button">×</button></div>' + (i < rs.length - 1 ? '<button class="add" type="button" title="Add an event here">+</button>' : '');
    const label = r.name || 'event ' + (i + 1);
    const tm = li.querySelector('.tm'), nm = li.querySelector('.nm'), len = li.querySelector('.len input');
    tm.value = r.time; tm.dataset.row = i; tm.dataset.f = 'time'; tm.id = 'sed-time-' + i; tm.setAttribute('aria-label', 'Start time of ' + label);
    nm.value = r.name; nm.dataset.row = i; nm.dataset.f = 'name'; nm.id = 'sed-name-' + i; nm.setAttribute('aria-label', 'Event ' + (i + 1) + ' name');
    len.dataset.len = i; len.setAttribute('aria-label', 'Length of ' + label + ' in minutes');
    li.querySelector('.grip').setAttribute('aria-label', 'Move ' + label + ' (drag, or use the up and down arrow keys)');
    li.querySelector('.del').setAttribute('aria-label', 'Remove ' + label);
    li.querySelector('.del').title = 'Remove ' + label;
    const add = li.querySelector('.add'); if (add) add.setAttribute('aria-label', 'Add an event after ' + label);
    paintDot(li.querySelector('.dot'), r.name);
    box.appendChild(li);
  });
  refreshLens();
  const h = hit ? rs.indexOf(hit) : -1;
  if (h >= 0) {
    const li = box.children[h], sel = { name: '.nm', time: '.tm', grip: '.grip' }[focus];
    li.classList.add('landed');
    const el = sel && li.querySelector(sel);
    if (el) { el.focus(); if (focus === 'name') el.select(); }
  }
}

/* ---------- reordering ---------- */
/* The events in their new order after moving `from` to `to`, as [{ i: index before the move, time }]. */
function moveOrder(list, from, to) {
  const n = list.length, m = list.map(minOf), order = list.map((_, i) => i);
  order.splice(to, 0, order.splice(from, 1)[0]);
  const lo = Math.min(from, to), hi = Math.max(from, to), out = order.map(i => ({ i, time: list[i].time }));
  for (let k = lo; k <= Math.min(hi + 1, n - 1); k++) if (isNaN(m[k])) return out;   // can't work out times: just move it
  let t = m[lo];
  for (let k = lo; k <= hi; k++) {
    const i = order[k];
    out[k].time = hhmm(t);
    t += i < n - 1 ? m[i + 1] - m[i] : 0;              // the last event has no length
  }
  return out;
}
function applyMove(from, to) {
  const rs = S.schedule, plan = moveOrder(rs, from, to);
  S.schedule = plan.map(p => ({ name: rs[p.i].name, time: p.time }));
  renderEditor(S.schedule[to], 'grip'); applyAll();
}
function startDrag(e, grip) {
  if (e.button !== 0) return;
  e.preventDefault();
  const li = grip.closest('.ev'), a = document.activeElement;
  if (a && a !== grip && box.contains(a)) { a.blur(); if (!li.isConnected) return; }   // commits a half-typed time first
  const items = Array.from(box.children), n = items.length, from = items.indexOf(li);
  if (n < 2) return;
  const pitch = items[1].offsetTop - items[0].offsetTop, y0 = e.clientY, list = clone(S.schedule);
  let to = from;
  box.classList.add('dragging'); li.classList.add('lift');
  grip.setPointerCapture(e.pointerId);
  const preview = () => {                              // show the times the move would give
    const plan = moveOrder(list, from, to);
    plan.forEach((p, k) => {
      const it = items[p.i], inp = it.querySelector('.len input'), d = k < n - 1 ? minOf(plan[k + 1]) - minOf(p) : NaN;
      it.querySelector('.tm').value = p.time;
      inp.value = d >= 0 ? d : '';
    });
  };
  const move = ev => {
    const dy = clamp(ev.clientY - y0, -from * pitch, (n - 1 - from) * pitch);
    li.style.transform = 'translateY(' + dy + 'px)';
    const t = clamp(Math.round(from + dy / pitch), 0, n - 1);
    if (t === to) return;
    to = t;
    items.forEach((it, i) => { if (it !== li) it.style.transform = i > from && i <= to ? 'translateY(' + -pitch + 'px)' : i < from && i >= to ? 'translateY(' + pitch + 'px)' : ''; });
    preview();
  };
  const end = commit => {
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', up);
    grip.removeEventListener('pointercancel', cancel);
    document.removeEventListener('keydown', esc);
    box.classList.remove('dragging');
    if (commit && to !== from) applyMove(from, to); else renderEditor();
  };
  const up = () => end(true), cancel = () => end(false), esc = ev => { if (ev.key === 'Escape') end(false); };
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', up);
  grip.addEventListener('pointercancel', cancel);
  document.addEventListener('keydown', esc);
}
box.addEventListener('pointerdown', e => { const g = e.target.closest('.grip'); if (g) startDrag(e, g); });
box.addEventListener('keydown', e => {
  const grip = e.target.closest('.grip');
  if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  const from = indexOfRow(grip.closest('.ev')), to = clamp(from + (e.key === 'ArrowUp' ? -1 : 1), 0, S.schedule.length - 1);
  if (to !== from) applyMove(from, to);
});

/* ---------- add, remove, change a length or a time ---------- */
function addAfter(i) {                                 // a new event where the one before it ends; later events move down
  const rs = S.schedule, nx = minOf(rs[i + 1]), start = isNaN(nx) ? (minOf(rs[i]) || 0) + LEN : nx;
  if (!isNaN(nx)) shiftFrom(i + 1, LEN);
  const ev = { name: 'New event', time: hhmm(start) };
  rs.splice(i + 1, 0, ev);
  renderEditor(ev, 'name'); applyAll();
}
box.addEventListener('click', e => {
  const li = e.target.closest('.ev');
  if (!li) return;
  const i = indexOfRow(li);
  if (e.target.closest('.del')) { S.schedule.splice(i, 1); renderEditor(); applyAll(); }
  else if (e.target.closest('.add')) addAfter(i);
});
$('btnAddRow').addEventListener('click', () => {       // at the end: the next round, 35 minutes after the last event
  const rs = rows(), last = rs.length ? rs[rs.length - 1].min + 35 : 13 * 60;
  const ev = { name: 'Round ' + (Math.max(0, ...rs.map(r => r.round)) + 1), time: hhmm(last) };
  S.schedule.push(ev);
  renderEditor(ev, 'name'); applyAll();
});
box.addEventListener('change', e => {
  const el = e.target, li = el.closest('.ev');
  if (!li) return;
  const i = indexOfRow(li), rs = S.schedule;
  if (el.dataset.len != null) {                        // a new length: move every later event by the difference
    const cur = minOf(rs[i + 1]) - minOf(rs[i]), v = Math.max(0, Math.round(Number(el.value)));
    if (el.value === '' || isNaN(cur) || !isFinite(v)) { refreshLens(); return; }
    shiftFrom(i + 1, v - cur);
    renderEditor(rs[i]); applyAll();
  } else if (el.dataset.f === 'time') {                // a new start time: the event may now belong elsewhere in the list
    const ev = rs[i];
    if (rs.slice().sort(byTime).some((r, k) => r !== rs[k])) { renderEditor(ev, 'time'); applyAll(); }
  }
});
