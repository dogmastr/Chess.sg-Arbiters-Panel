/* Check for who wins what on the arbiter's Prizes panel (js/winners.js allocate, with the awards in js/events.js).
   Run:  node test/winners.js   (prints "ok", or throws on the first thing that is wrong) */

const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = f => fs.readFileSync(require('path').join(__dirname, '..', 'js', f), 'utf8');

// the arbiter page's scripts share one scope; run the ones we need in a fake one (while loading, winners.js only listens for clicks)
const ctx = vm.createContext({ document: { getElementById: () => ({ addEventListener() {} }) }, localStorage: { getItem: () => null, setItem() {} }, location: { hash: '' } });
vm.runInContext(['util.js', 'events.js', 'state.js', 'winners.js'].map(src).join('\n'), ctx);

// a ranking, best first: name|age group|rating|points
const give = (ev, list) => {
  const P = list.map((l, i) => { const [name, cat, rtg, pts] = l.split('|'); return { name, key: name, cat, rtg: Number(rtg), pts: Number(pts), rk: i + 1 }; });
  const a = vm.runInContext('allocate(' + JSON.stringify(P) + ', EVENTS.' + ev + '.awards)', ctx);
  return {   // Array.from: arrays made in the fake scope are not this file's kind of Array
    won: Array.from(a.rows, r => r.pr.label + ': ' + (r.w ? r.w.name : '-') + (r.skipped.length ? ' (not ' + r.skipped.map(p => p.name).join(', ') + ')' : '')),
    medals: Array.from(a.medals, m => m.p.name + ' ' + m.tier.name)
  };
};

const age = give('agegroup', ['A|U13|1500|6.5', 'B|U13|0|5.5', 'C|U11|1400|5', 'D|U13|0|5', 'E||0|4.5', 'F|U09|0|4', 'G|U13|0|3.5', 'H|U11|0|3', 'I|U13|0|3',
  'J|U09|0|2', 'N|u 13|0|2', 'K|U11|0|1.5', 'L|U13|0|1', 'M|U09|0|0.5', 'O|U11|0|0']);
assert.deepStrictEqual(age.won, ['Overall 1st: A', 'U13 1st: B (not A)',     // the best U13 player took the overall prize: said once, under U13 1st
  'U13 2nd: D', 'U13 3rd: G', 'U11 1st: C', 'U11 2nd: H', 'U11 3rd: K', 'U9 1st: F', 'U9 2nd: J', 'U9 3rd: M']);   // "U09" is U9
assert.deepStrictEqual(age.medals, ['E Distinction', 'I Distinction', 'N Merit', 'L Commendation']);   // E has no age group, I and N came 4th and 5th in U13, O scored 0

const rapid = ['a||1800|6', 'b||0|5.5', 'c|U13|0|5', 'd||1700|5', 'e|U11|1600|4.5', 'f|U13|0|4', 'g||0|4', 'h|U9|0|3', 'i|U11|1500|2'];
assert.deepStrictEqual(give('rapid', rapid).won, ['1st: a', '2nd: b', '3rd: c', '4th: d', '5th: e', 'U13 Champion: f (not c)', 'U11 Champion: i (not e)',
  'U9 Champion: h', 'Unrated Champion: g (not b, c, f)']);            // one prize each: f is unrated too, but already has the U13 prize
assert.deepStrictEqual(give('rapid', rapid).medals, []);
assert.deepStrictEqual(give('rapid', rapid.filter(l => l[0] !== 'f')).won.slice(5), ['U13 Champion: - (not c)', 'U11 Champion: i (not e)',
  'U9 Champion: h', 'Unrated Champion: g (not b, c)']);               // f excluded: the only U13 player left already has 3rd, so nobody gets it

// the ranking itself, when the pasted table has no "Rk." column: points, then the tie-breaks as numbers (10 beats 9.5), then rating
const order = P => vm.runInContext('S.standings.players = ' + JSON.stringify(P) + '; ordered().map(p => p.name).join("")', ctx);
assert.strictEqual(order([{ name: 'B', pts: 5, tbs: [0, 9.5], rtg: 1500 }, { name: 'D', pts: 4, tbs: [0, 30], rtg: 2000 }, { name: 'A', pts: 5, tbs: [0, 10], rtg: 1000 }, { name: 'C', pts: 5, tbs: [0, 9.5], rtg: 1400 }]), 'ABCD');

console.log('ok');
