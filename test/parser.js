/* Check for reading a page copied from chess-results (js/parser.js): the table, and the round numbers in the headings above it.
   Run:  node test/parser.js   (prints "ok", or throws on the first thing that is wrong) */

const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = f => fs.readFileSync(require('path').join(__dirname, '..', 'js', f), 'utf8');

const ctx = vm.createContext({});
vm.runInContext(src('util.js') + '\n' + src('parser.js'), ctx);
const parse = lines => vm.runInContext('parseChessResults(' + JSON.stringify(lines.join('\n')) + ')', ctx);
const row = (...cells) => cells.join('\t');

// a crosstable as chess-results writes it: "4w1" = beat the player ranked 4 with white, ½ a draw, + and - a forfeit, "-1" a bye, "-0" not paired
const NAME = '43rd Chess.sg Rapid Championship | 15+10 3 Rds | Sat Oct 3';   // "43rd" is not 43 rounds
const cross = parse([NAME, 'Final Ranking crosstable after 3 Rounds', '',
  row('Rk.', '', '', 'Name', 'Rtg', 'FED', '1.Rd', '2.Rd', '3.Rd', 'Pts.', ' TB1 ', ' TB2 '),
  row('1', '', '', 'Alpha One', '1800', 'SGP', '  4w1', '  3b1', '  2w½', '2,5', '0', '4,5'),
  row('2', '', '', 'Beta Two', '1700', 'SGP', '  3w1', '   -1', '  1b½', '2,5', '0', '4'),
  row('3', '', '', 'Gamma Three', '0', 'SGP', '  2b0', '  1w0', '  4w+', '1', '0', '5'),
  row('4', '', '', 'Delta Four', '0', 'SGP', '  1b0', '   -0', '  3b-', '0', '0', '6'),
  '', 'Annotation:']);
assert.strictEqual(cross.error, undefined);
assert.deepStrictEqual([cross.players.length, cross.after, cross.total, cross.games], [4, 3, 3, 4]);   // 4 games played: the forfeit is not one
const [a, b, c, d] = Array.from(cross.players);
assert.deepStrictEqual([a.name, a.rk, a.rtg, a.pts, Array.from(a.tbs)], ['Alpha One', 1, 1800, 2.5, [0, 4.5]]);
assert.deepStrictEqual(Array.from(a.res, x => x.opp + ' ' + x.color + ' ' + x.score), ['delta four w 1', 'gamma three b 1', 'beta two w 0.5']);   // opponents by name, not by rank
assert.deepStrictEqual([b.res[1].bye, b.res[1].score, d.res[1].bye, d.res[1].score], [true, 1, true, 0]);
assert.deepStrictEqual([c.res[2].forfeit, c.res[2].score, d.res[2].forfeit, d.res[2].score], [true, 1, true, 0]);

// the Standings page has no rounds: the heading says which round it is after
const stand = heading => parse([NAME, heading, '',
  row('Rk.', 'SNo', '', '', 'Name', 'Typ', 'sex', 'FED', 'Rtg', 'Pts.', ' TB1 '),
  row('1', '2', '', '', 'One, Alpha', 'U13', '', 'SGP', '1800', '2,5', '0'),
  row('2', '1', '', '', 'Two, Beta', '', '', 'SGP', '0', '2', '0')]);
assert.strictEqual(stand('Rank after Round 2').after, 2);
const fin = stand('Final Ranking after 3 Rounds');
assert.deepStrictEqual([fin.after, fin.total, fin.hasPts, fin.hasRounds, fin.players[0].typ, fin.players[0].key], [3, 3, true, false, 'U13', 'alpha one']);   // the same key as "Alpha One" in the crosstable

// the Starting rank: no points, so it only brings names, ratings and age groups
const start = parse([NAME, 'Starting rank', '', row('No.', '', '', 'Name', 'FideID', 'FED', 'Rtg', 'sex', 'Typ'), row('1', '', '', 'One, Alpha', '', 'SGP', '1800', '', 'U13'), row('2', '', '', 'Two, Beta', '', 'SGP', '0', 'w', 'U09')]);
assert.deepStrictEqual([start.hasPts, start.total, start.players.length, start.players[1].typ, start.players[1].sno], [false, 3, 2, 'U09', 2]);

assert.ok(parse(['nothing to see here']).error);

console.log('ok');
