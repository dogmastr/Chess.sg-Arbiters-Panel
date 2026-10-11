/* Saved settings. S is the current event's data (the EVENT_KEYS from events.js) plus the settings shared by all events; save() writes both to localStorage. */

const KEY = 'chessSgDisplay.v2';

const VIEWS = { schedule: 'Playing schedule', prizes: 'Prizes', standings: 'Standings' };   // what the top-right pane can show
const isView = v => Object.keys(VIEWS).includes(v);

const DEFAULTS = {
  eventId: 'agegroup',
  tz: 'Asia/Singapore',
  offsetSec: 0,
  h12: true,
  infoView: 'schedule',                                // one of VIEWS, or 'rotate': step through rotate.steps in a loop that started at t0 (ms)
  rotate: { t0: 0, steps: [{ v: 'schedule', s: 15 }, { v: 'prizes', s: 15 }, { v: 'standings', s: 20 }] },   // s = seconds on screen
  showHeader: false,                                   // chess-results pane: false opens at the results table, true shows the whole page from the top
  announce: true,
  layout: { col: 0.5, row: 0.74 },
  crop: { results: { z: 100, t: 0, r: 0, b: 0, l: 0 } }
};

const evKey = id => KEY + '.event.' + id;
function globalPart(saved) {
  const s = Object.assign(clone(DEFAULTS), saved || {});
  s.layout = Object.assign(clone(DEFAULTS.layout), (saved && saved.layout) || {});
  s.crop = { results: Object.assign(clone(DEFAULTS.crop.results), (saved && saved.crop && saved.crop.results) || {}) };
  const r = s.rotate || {};                            // a pasted settings code may hold anything
  s.rotate = { t0: Number(r.t0) || 0, steps: (Array.isArray(r.steps) ? r.steps : DEFAULTS.rotate.steps).filter(x => x && isView(x.v)).map(x => ({ v: x.v, s: clamp(Math.round(Number(x.s)) || 15, 1, 600) })) };
  delete s.docUrl; delete s.docView;
  EVENT_KEYS.forEach(k => { delete s[k]; });
  if (!EVENTS[s.eventId]) s.eventId = 'agegroup';
  return s;
}
function eventPart(id, saved) {
  const def = EVENTS[id].defaults(), e = {};
  EVENT_KEYS.forEach(k => { e[k] = saved && saved[k] !== undefined && saved[k] !== null ? saved[k] : def[k]; });
  if (!e.standings || !Array.isArray(e.standings.players)) e.standings = def.standings;
  e.standings.players.forEach(p => { p.rk = Number(p.rk) || null; p.rtg = Number(p.rtg) || 0; });   // these two are shown as they are, and a pasted settings code may hold anything
  if ((EVENTS[id].oldUrls || []).includes(e.resultsUrl)) e.resultsUrl = def.resultsUrl;   // saved before the event had its own tournament link
  return e;
}
const isSaved = k => k === KEY || String(k || '').startsWith(evKey(''));   // is this localStorage key one that save() writes? (for the storage event)
function storedEvent(id) { try { return JSON.parse(localStorage.getItem(evKey(id)) || 'null'); } catch (e) { return null; } }
function hashEvent() { const h = String(location.hash || '').replace(/^#/, '').toLowerCase(); return EVENTS[h] ? h : null; }
function load() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  const g = globalPart(saved);
  g.eventId = hashEvent() || g.eventId;
  let ev = storedEvent(g.eventId);
  if (!ev && g.eventId === 'agegroup' && saved && saved.title !== undefined) ev = saved;   // saved before events existed
  return Object.assign(g, eventPart(g.eventId, ev));
}
function save() {
  try {
    const g = {}, e = {};
    Object.keys(S).forEach(k => { (EVENT_KEYS.includes(k) ? e : g)[k] = S[k]; });
    localStorage.setItem(KEY, JSON.stringify(g));
    localStorage.setItem(evKey(S.eventId), JSON.stringify(e));
  } catch (e) {}
}
let S = load();

/* the players in rank order: chess-results' own ranking when every player has one, otherwise points, tie-breaks, rating */
function ordered() {
  const P = S.standings.players.slice();
  const hasRk = P.every(p => p.rk);
  const tb = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (b[i] || 0) - (a[i] || 0); if (d) return d; } return 0; };   // tie-breaks are numbers: the higher one first
  return P.sort((a, b) => hasRk ? a.rk - b.rk : (b.pts - a.pts) || tb(a.tbs || [], b.tbs || []) || b.rtg - a.rtg);
}
