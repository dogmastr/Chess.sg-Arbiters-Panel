/* Chess-results pane zoom and crop, and the grid sizes. The page is cross-site, so cropping works like a window behind a cut-out:
   the frame is made larger by the cropped amounts and shifted so only the kept area shows. Zoom is set on the arbiter page, the top
   crop is the automatic skip of chess-results' own header (results.js); the pane split and the other crop edges keep the saved
   values (the settings code can carry other ones). */

function layoutPane() {
  const c = S.crop.results, z = c.z / 100;
  const W = R.el.clientWidth, H = R.el.clientHeight;
  if (!W || !H) return;
  const top = headerSkip(R.eff);                       // the automatic header skip (results.js)
  R.frame.style.width = (W / z + c.l + c.r) + 'px';
  R.frame.style.height = (H / z + top + c.b) + 'px';
  R.frame.style.transform = 'translate(' + (-c.l * z) + 'px,' + (-top * z) + 'px) scale(' + z + ')';
}
if ('ResizeObserver' in window) new ResizeObserver(layoutPane).observe(R.el);

const grid = $('grid');
function applyGrid() {
  const c = clamp(S.layout.col, 0.15, 0.85), r = clamp(S.layout.row, 0.2, 0.9);
  grid.style.gridTemplateColumns = 'minmax(0,' + c + 'fr) var(--gap) minmax(0,' + (1 - c) + 'fr)';
  grid.style.gridTemplateRows = 'minmax(0,' + r + 'fr) var(--gap) minmax(0,' + (1 - r) + 'fr)';
}
const app = $('app');
