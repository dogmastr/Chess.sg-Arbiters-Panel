/* Small helpers shared by every file. */

const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const nameKey = n => String(n).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
const sameDay = ts => !!ts && new Date(ts).toDateString() === new Date().toDateString();
const fmtPts = v => { const w = Math.floor(v), h = v - w >= 0.5; return (w || !h ? String(w) : '') + (h ? '½' : ''); };

let toastT;
function toast(msg, ms) { const t = $('toast'); t.textContent = msg; t.hidden = false; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = ''; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || (msg.length > 70 ? 8000 : 4200)); }
