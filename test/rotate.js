/* Check for the TV's rotation timing (js/tabs.js rotStep) and the clean-up of a rotation read from saved settings (js/state.js).
   Run:  node test/rotate.js   (prints "ok", or throws on the first thing that is wrong) */

const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = f => fs.readFileSync(require('path').join(__dirname, '..', 'js', f), 'utf8');

// the TV page's scripts share one scope; run the two files we need in a fake one
let now = 0;
const ctx = vm.createContext({ document: {}, Date: { now: () => now }, localStorage: { getItem: () => null, setItem() {} }, location: { hash: '' },
  EVENTS: { agegroup: { defaults: () => ({ standings: { players: [] } }) } }, EVENT_KEYS: [] });
vm.runInContext(src('util.js') + '\n' + src('state.js') + '\n' + src('tabs.js'), ctx);
const run = js => vm.runInContext(js, ctx);

const T0 = 1e12;
run('S.rotate = { t0: ' + T0 + ', steps: [{ v: "schedule", s: 15 }, { v: "prizes", s: 10 }, { v: "standings", s: 20 }] }');
const at = sec => { now = T0 + sec * 1000; return run('rotStep()'); };
const is = (sec, v, i, secIn) => {
  const r = at(sec);
  assert.strictEqual(r.v, v, sec + ' s: ' + r.v);
  assert.ok(Math.abs(r.at - secIn) < 1e-6, sec + ' s: ' + r.at + ' s into the step');
};
is(0, 'schedule', 0, 0);
is(14.9, 'schedule', 0, 14.9);
is(15, 'prizes', 0, 0);
is(24.5, 'prizes', 0, 9.5);
is(25, 'standings', 0, 0);
is(44.999, 'standings', 0, 19.999);
is(45, 'schedule', 0, 0);                              // the loop starts over
is(45 * 1000 + 16, 'prizes', 0, 1);                    // and keeps going
is(-5, 'standings', 0, 15);                            // the PC clock set back before t0: still a valid step
assert.strictEqual(at(3).dur, 15);

run('S.rotate.steps = []');
assert.strictEqual(run('rotStep()'), null);            // nothing to rotate: the caller shows the schedule

// a rotation from a pasted settings code can hold anything
const clean = r => run('globalPart(' + JSON.stringify({ rotate: r }) + ').rotate');
assert.strictEqual(clean(5).steps.length, 3);          // not an object: the default steps
assert.strictEqual(clean({ steps: 'x' }).steps.length, 3);
const c = clean({ t0: 'x', steps: [{ v: 'prizes', s: 0 }, { v: 'nope', s: 5 }, null, { v: 'standings', s: 9999 }, { v: 'schedule' }] });
assert.deepStrictEqual(JSON.parse(JSON.stringify(c)), { t0: 0, steps: [{ v: 'prizes', s: 15 }, { v: 'standings', s: 600 }, { v: 'schedule', s: 15 }] });

console.log('ok');
