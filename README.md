# Chess.sg Tournament Display

A tournament display for Chess.sg's main computer and TV. It is two pages that work together:

- **Arbiter page** (`index.html`): a dashboard with two areas, picked in the sidebar (the page remembers which one is open).
  - **Main panel:** the settings. The tiles along the top show what is on now, what is next, what the TV shows and the standings; a panel for each setting sits below (click a panel's header to minimise it; the page remembers which ones). Pick the event, paste the chess-results link, edit the schedule, update the standings, choose what the TV shows. Everything you change appears on the TV straight away.
  - **Prizes panel:** who wins what, worked out from the standings: the placing prizes, score medals, what to bring to the prize table, cash payouts and deliveries. The prize list the TV shows is edited here too.
- **TV page** (`display.html`): the display itself, with three panes:
  - **Left:** the live [chess-results](https://chess-results.com) page for the tournament.
  - **Top right:** the playing schedule, the prizes, or the standings with each player's chance of winning.
  - **Bottom right:** a large clock with a countdown to the next item on the schedule.

No build step and no dependencies: plain HTML, CSS and JavaScript.

## Run it

- **On the web:** open <https://dogmastr.github.io/chess-sg-tournament-display/>. It is this repo's root, served by GitHub Pages from branch `main`, so a push to `main` updates it within a minute or two.
- **From disk:** download or clone the repo and open `index.html` in a recent Chrome or Edge.

The two ways keep separate settings (each is saved in the browser under its own address), so use the same one all day.

It needs a browser with CSS container-query units (Chrome/Edge 105+, Firefox 110+, Safari 16+) and an internet connection for the chess-results pane. The Geist font comes from Google Fonts and falls back to the system font offline.

## At the venue

1. Open `index.html` on your computer and click **TV display ↗**.
2. Drag the new tab out into its own window, move that window onto the TV, click it and press <kbd>F</kbd> for full screen.
3. Do everything else from the arbiter page.

Both pages must be in the same browser (settings are saved in that browser and shared between the two windows through it), and the TV page must be in its own window: a hidden tab gets paused by the browser and the clock would stop. To set up another computer, copy the *Settings code* (Backup, on the Main panel).

## Project layout

```text
index.html       arbiter page: the dashboard (sidebar, then the Main panel and the Prizes panel)
display.html     TV page: the three panes, no buttons (F for full screen)
css/style.css    all styles, both pages
img/logo.png     the Chess.sg logo: top of the arbiter page, and the tab icon of both pages
test/rotate.js   check for the rotation timing: node test/rotate.js
test/winners.js  check for who wins what: node test/winners.js
test/parser.js   check for reading a pasted chess-results page: node test/parser.js
js/
  util.js        small shared helpers                                      both
  events.js      per-tournament data: schedules, prizes, awards, starting list  both
  state.js       saved settings (localStorage), kept per event; rank order both
  schedule.js    time helpers and the playing schedule                     both
  parser.js      reads a table pasted from chess-results                   arbiter
  paste.js       paste dialog, Ctrl+V, applying pasted standings           arbiter
  sched-editor.js playing schedule timeline: drag, add between, reset      arbiter
  winners.js     Prizes panel: who wins what, cash payouts, deliveries     arbiter
  settings.js    settings form, page pickers, backup code, sidebar, events arbiter (starts it)
  results.js     left pane: the chess-results page                         TV
  layout.js      chess-results zoom and crop, grid sizes                   TV
  prizes.js      prize list parser and the Prizes tab                      TV
  tabs.js        the Schedule / Prizes / Standings tabs, and rotating them TV
  winchance.js   win-chance simulation                                     TV
  standings.js   the Standings tab                                         TV
  clock.js       clock, countdown, event announcement                      TV
  main.js        startup, follows the arbiter page, keys, full screen      TV (starts it)
```

**How the two pages talk:** every change saves to the browser's localStorage, and the browser tells the other window through the `storage` event (see the end of `settings.js` and `main.js`).

The scripts are plain `<script>` tags rather than ES modules, so the pages also work when opened straight from disk (Chrome and Edge refuse modules from `file://`). Each page's scripts share one scope and load in the order listed at the bottom of its HTML file; `settings.js` (arbiter) and `main.js` (TV) start everything and must stay last. To add a file, put its `<script>` line above that.

## Licence

Proprietary. © 2026 dogmastr, all rights reserved. Chess.sg alone may use, copy, change and redistribute this software freely, for good; nobody else may use, copy, change, host or redistribute it. The full terms are in [LICENSE](LICENSE).
