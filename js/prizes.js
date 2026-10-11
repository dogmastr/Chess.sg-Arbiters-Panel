/* Prizes tab: turns the prize list text from Settings into the view. */

function parsePrizes(text) {
  const out = { fund: '', sections: [] };
  let sec = null;
  String(text || '').split('\n').forEach(raw => {
    const line = raw.trim();
    if (!line) return;
    let m;
    if ((m = /^prize fund\s*:\s*(.+)$/i.exec(line))) { out.fund = m[1]; return; }
    if ((m = /^#+\s*(.+)$/.exec(line))) {
      const t = /^(.*?)\s*\((.+)\)\s*$/.exec(m[1]);
      sec = { title: t ? t[1] : m[1], sub: t ? t[2] : '', rows: [], notes: [] };
      out.sections.push(sec);
      return;
    }
    if (!sec) { sec = { title: '', sub: '', rows: [], notes: [] }; out.sections.push(sec); }
    if ((m = /^[-•*]\s*(.+)$/.exec(line))) { sec.notes.push(m[1]); return; }
    const i = line.indexOf(':');
    if (i > 0) sec.rows.push({ label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() });
    else sec.notes.push(line);
  });
  return out;
}
const TROPHY = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M15 6h18v12a9 9 0 0 1-18 0V6z" fill="currentColor" fill-opacity=".18"/><path d="M15 10H8v3a7 7 0 0 0 7 7M33 10h7v3a7 7 0 0 1-7 7M24 27v8M17 42h14M19 35h10l2 7H17l2-7z"/></svg>';
function badge(label) {
  let m;
  if ((m = /^(\d+)(st|nd|rd|th)$/i.exec(label))) {
    const n = Number(m[1]);
    return '<span class="medal ' + (n <= 3 ? 'm' + n : 'mx') + '">' + n + '<sup>' + esc(m[2]) + '</sup></span>';
  }
  if ((m = /^(\d+(?:\.\d+)?)\+\s*(points?|pts?)?$/i.exec(label))) return '<span class="pts">' + esc(m[1]) + '+<small>pts</small></span>';
  return '<span class="lbl2">' + esc(label) + '</span>';
}
function renderPrizes() {
  const p = parsePrizes(S.prizesText);
  $('prizeFund').innerHTML = p.fund ? 'Prize fund <strong>' + esc(p.fund) + '</strong>' : '';
  let featDone = false, k = 0;
  const st = () => ' class="stag" style="--i:' + (k++) + '"';
  const html = p.sections.map(sec => {
    const head = sec.title ? '<h3>' + esc(sec.title) + (sec.sub ? ' <span>· ' + esc(sec.sub) + '</span>' : '') + '</h3>' : '';
    const notes = sec.notes.length ? '<ul class="pnotes">' + sec.notes.map(n => '<li' + st() + '>' + esc(n) + '</li>').join('') + '</ul>' : '';
    if (!sec.rows.length) return notes;
    if (!featDone && sec.rows.length === 1) {
      featDone = true;
      const r = sec.rows[0];
      const place = /^1st$/i.test(r.label) ? '' : esc(r.label) + ' · ';
      return '<div class="feat stag" style="--i:' + (k++) + '">' + TROPHY + '<div><div class="eyebrow">' + place + esc(sec.title || 'Top prize') + (/^1st$/i.test(r.label) ? ' champion' : '') + '</div><div class="val">' + esc(r.value) + '</div></div></div>' + notes;
    }
    const hk = k++;
    return '<section class="psec">' + head.replace('<h3>', '<h3 class="stag" style="--i:' + hk + '">') + '<div class="prows">' +
      sec.rows.map(r => { const a = st(); return '<div' + a + '>' + badge(r.label) + '</div><div' + a + '>' + esc(r.value) + '</div>'; }).join('') +
      '</div></section>' + notes;
  }).join('');
  $('prizes').innerHTML = html || '<p class="hint">Add prizes in Settings.</p>';
}
