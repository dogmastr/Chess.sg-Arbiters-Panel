/* Left pane: the embedded chess-results page. Which page it shows is chosen on the arbiter page (settings.js). */

const R = {
  el: $('pane-results'), frame: $('frame-results'),
  empty: document.querySelector('#pane-results [data-empty]'),
  src: null, eff: '', geo: null                        // src: the link as saved; eff: the address the frame really loads
};

/* A chess-results tournament page opens with its banner, the tournament details and a table of links, with the results far below, so
   the pane would show mostly header. This page can't scroll a frame from another site, but layout.js can shift the frame up. The page is
   a fixed 985 px wide whatever the window, so its header is a fixed height: measured on a Chess.sg tournament, the results heading sits
   424 px down when the details are left out ("No tournament detail", turdet=NO) and 724 px with them (the crosstable always has them).
   We hide a little less than that, so a table is never cut: at worst some rows of links still show above it (the details can be
   longer or shorter in another tournament, so the crosstable gets more room). "Show the page's header" (S.showHeader) on the arbiter
   page turns all of this off: the page loads as chess-results sends it, from the very top. */
const isTournamentPage = url => /^https?:\/\/[^\/?#]*chess-results\.com\/tnr\d+\.aspx/i.test(url);
const artOf = url => Number((/[?&]art=(\d+)/i.exec(url) || [])[1] || 0);
function frameUrl(url) {                               // ask chess-results to leave the tournament details out, where it can
  if (S.showHeader) return url;
  return isTournamentPage(url) && [0, 1, 2].includes(artOf(url)) && !/[?&]turdet=/i.test(url) ? url + (url.includes('?') ? '&' : '?') + 'turdet=NO' : url;
}
function headerSkip(url) {                             // px of the page to hide above the results heading
  if (S.showHeader || !isTournamentPage(url) || ![0, 1, 2, 4].includes(artOf(url))) return 0;   // other pages (player cards, statistics…) are left as they come
  return artOf(url) === 4 || /[?&]turdet=yes/i.test(url) ? 650 : 416;   // 416: just under the search row, which ends at 416
}

function applyPage() {
  const link = String(S.resultsUrl || '').trim(), url = /^https?:\/\//i.test(link) ? link : '', eff = frameUrl(url);   // a web address only: the frame runs anything else (javascript:…) as this page
  R.empty.hidden = !!url;
  if (R.eff === eff) return;                           // nothing changed: don't reload the frame
  R.src = url;
  R.eff = eff;
  if (url) R.frame.src = eff; else R.frame.removeAttribute('src');
}
/* the arbiter page's Reload button: it can't reach this page's frame, so it saves a key and main.js calls this when the storage event arrives */
function reloadResults() { const s = R.frame.getAttribute('src'); if (s) R.frame.src = s; }
