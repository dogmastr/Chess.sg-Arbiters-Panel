/* Everything that changes from tournament to tournament: schedule, prizes (the list the TV shows, and who wins what), starting list.
   To add an event: write its schedule, prizes and awards below, add an entry to EVENTS, then open the arbiter page with #id on the end of its address. */

/* ---------- Age Group Championship ---------- */

const AGE_SCHEDULE = [
  { name: 'Doors open', time: '13:00' },
  { name: 'Round 1', time: '13:15' },
  { name: 'Round 2', time: '13:50' },
  { name: 'Round 3', time: '14:25' },
  { name: 'Round 4', time: '15:00' },
  { name: 'Round 5', time: '15:35' },
  { name: 'Round 6', time: '16:10' },
  { name: 'Round 7', time: '16:45' },
  { name: 'Prize presentation', time: '17:30' },
  { name: 'End', time: '17:45' }
];

const AGE_PRIZES = [
  'Prize fund: $500',
  '',
  '## Overall',
  '1st: Trophy + wood chess set',
  '',
  '## Age categories (U13 · U11 · U09, each)',
  '1st: Trophy + magnetic chess set',
  '2nd: Medal + magnetic chess set',
  '3rd: Medal + magnetic chess set',
  '',
  '## Score awards (all players)',
  '3+ points: Distinction medal + chess keychain',
  '2+ points: Merit medal + chess keychain',
  '1+ point: Commendation medal + chess keychain',
  'Everyone: Lucky draw chess keychain',
  '',
  '## Notes',
  '- Prizes can be exchanged for cash: wood chess set $98, magnetic chess set $14.',
  '- One prize per player (keychains excluded). You receive the highest prize you qualify for.',
  '- Players cannot win prizes in an older age category.'
].join('\n');

// Starting rank of tnr1515370 (No|Name|FED|Rtg|Typ)
const START_LIST = `1|Wang, Shiming|SGP|1637|U11
2|Huang, Chengyang Elvin|SGP|1531|U13
3|Pham, Duy Hung Lucas|SGP|1515|U13
4|Nair, Vedant Praveen|SGP|1481|U13
5|Ong, Linus Kai En|SGP|1453|U13
6|Goh, Bradley Ethan|SGP|1430|U11
7|Gupta, Avyaan|IND|1428|U09
8|Bergert, Cian Lee|SGP|1423|U13
9|Aadithia, Kanakadas|IND|1411|U13
10|Goh, Qingyi Liam|SGP|0|U11
11|Hur, Bumsoo|KOR|0|U09
12|Kongara, Sameer Kedar|SGP|0|U09
13|Koo, Yi Kang Louis|SGP|0|U13
14|Lee, Jia Yang George|SGP|0|U09
15|Lee, Zild Yu Jonathan|SGP|0|
16|Li, Yunrui|SGP|0|U09
17|Lim, Edward Jun Xi|SGP|0|U09
18|Lim, Leonard Jun Feng|SGP|0|U09
19|Low, Si Yong Jonah|SGP|0|U13
20|Ng, Xuan Kai Gareth|SGP|0|U11
21|Ngan, Min Hao|SGP|0|U13
22|Oh, Zhi Kai Ethan|SGP|0|U13
23|Pon, Brian|SGP|0|U09
24|Roger, Pereira|IND|0|U13
25|Sivaprakash, Jai Ganesh|SGP|0|U13
26|Tan, Jude|SGP|0|U09
27|Vijay, Samanvitha|IND|0|U11
28|Yuan, Yi Zhe Seth|SGP|0|U09
29|Zhang, Hanning|SGP|0|U13`;

function startData() {
  return {
    source: 'start', afterRound: 0, totalRounds: 0, updated: null,
    players: START_LIST.split('\n').map(l => {
      const [no, name, fed, rtg, cat] = l.split('|');
      return { name, key: nameKey(name), fed, rtg: Number(rtg) || 0, cat: cat || '', pts: 0, rk: Number(no), res: [] };
    })
  };
}

/* ---------- Rapid Championship ---------- */

// Chess.sg Rapid Championship: 7 rounds of 15+10, 50-minute slots, 15-minute break after round 4
const RAPID_SCHEDULE = [
  { name: 'Doors open', time: '13:00' },
  { name: 'Round 1', time: '13:15' },
  { name: 'Round 2', time: '14:05' },
  { name: 'Round 3', time: '14:55' },
  { name: 'Round 4', time: '15:45' },
  { name: 'Break', time: '16:35' },
  { name: 'Round 5', time: '16:50' },
  { name: 'Round 6', time: '17:40' },
  { name: 'Round 7', time: '18:30' },
  { name: 'Prize presentation', time: '19:20' },
  { name: 'End', time: '19:30' }
];

const RAPID_PRIZES = [
  'Prize fund: $800',
  '',
  '## Open',
  '1st: Trophy + wood chess set ($198) + clock ($35)',
  '2nd: Trophy + wood chess set ($198)',
  '3rd: Trophy + premium chess set ($48) + clock ($35)',
  '4th: Trophy + premium chess set ($48)',
  '5th: Trophy + premium chess set ($48)',
  '',
  '## Category champions',
  'Unrated: Trophy + magnetic chess set ($28)',
  'U13: Trophy + magnetic chess set ($28)',
  'U11: Trophy + magnetic chess set ($28)',
  'U9: Trophy + magnetic chess set ($28)',
  '',
  '## Notes',
  '- Prizes can be exchanged for cash: wood chess set $98, magnetic chess set $14.',
  '- One prize per player: you receive the highest-value prize you qualify for.',
  '- An unrated player who also wins an age category receives the age-category prize.',
  '- Players cannot win prizes in an older age category.'
].join('\n');

/* ---------- Who wins what (the Prizes panel of the arbiter page) ----------
   An event's prizes, most valuable first. Each goes to the highest-ranked player who may win it and has no prize yet.
     card    the box the prize is listed in        place    its medal number (leave out for a category champion)
     cat     only players of this age group        unrated  only players without a rating
     award + items   what is handed over. The first item can be swapped for `cash` dollars; `ship: true` means it can be delivered.
   tiers: score medals (each with a keychain) for the players without a prize, best first.
   allGrouped: every player should be in one of the age groups, so the panel says who is not. */

const WOOD = 'Wood chess set', MAG = 'Magnetic chess set', PREM = 'Premium chess set', CLOCK = 'Clock';
const AGE_GROUPS = ['U13', 'U11', 'U9'];

const AGE_AWARDS = {
  prizes: [
    { card: 'Overall', place: 1, label: 'Overall 1st', award: 'Trophy', items: [WOOD], cash: 98, ship: true },
    ...AGE_GROUPS.flatMap(c => ['1st', '2nd', '3rd'].map((nth, i) => ({ card: c, cat: c, place: i + 1, label: c + ' ' + nth, award: i ? 'Medal' : 'Trophy', items: [MAG], cash: 14 })))
  ],
  tiers: [{ min: 3, name: 'Distinction' }, { min: 2, name: 'Merit' }, { min: 1, name: 'Commendation' }],
  allGrouped: true
};

const RAPID_AWARDS = {
  prizes: [
    { card: 'Top 5', place: 1, label: '1st', award: 'Trophy', items: [WOOD, CLOCK], cash: 98, ship: true },
    { card: 'Top 5', place: 2, label: '2nd', award: 'Trophy', items: [WOOD], cash: 98, ship: true },
    { card: 'Top 5', place: 3, label: '3rd', award: 'Trophy', items: [PREM, CLOCK] },
    { card: 'Top 5', place: 4, label: '4th', award: 'Trophy', items: [PREM] },
    { card: 'Top 5', place: 5, label: '5th', award: 'Trophy', items: [PREM] },
    ...AGE_GROUPS.map(c => ({ card: 'Champions', cat: c, label: c + ' Champion', award: 'Trophy', items: [MAG], cash: 14 })),
    { card: 'Champions', unrated: true, label: 'Unrated Champion', award: 'Trophy', items: [MAG], cash: 14 }   // after the age groups: a player who tops both gets the age-group prize
  ],
  tiers: []
};

/* ---------- The events ---------- */

const emptyData = () => ({ source: 'start', afterRound: 0, totalRounds: 0, updated: null, players: [] });

// Each event keeps its own name, link, schedule, prizes and standings; everything else is shared.
const EVENT_KEYS = ['title', 'resultsUrl', 'schedule', 'prizesText', 'standings', 'stFilter', 'unratedRtg', 'unratedGroup'];
const EVENTS = {
  agegroup: {
    label: 'Age Group',
    awards: AGE_AWARDS,
    defaults: () => ({ title: 'Chess.sg Age Group Championship', resultsUrl: 'https://chess-results.com/tnr1515370.aspx?lan=1', schedule: clone(AGE_SCHEDULE), prizesText: AGE_PRIZES, standings: startData(), stFilter: 'All', unratedRtg: 1000, unratedGroup: false })
  },
  rapid: {
    label: 'Rapid',
    awards: RAPID_AWARDS,
    oldUrls: ['https://chess-results.com/fed.aspx?lan=1&fed=SGP'],   // links this event used to start with: a saved copy of one is swapped for the link below
    defaults: () => ({ title: 'Chess.sg Rapid Championship', resultsUrl: 'https://s1.chess-results.com/tnr1510425.aspx?lan=1', schedule: clone(RAPID_SCHEDULE), prizesText: RAPID_PRIZES, standings: emptyData(), stFilter: 'All', unratedRtg: 1000, unratedGroup: true })
  }
};
