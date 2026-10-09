/* Row 46 check: the shopkeepers' lines and places.   node tests/shopkeepers.mjs */
import { KEEPERS, lineFor, keeperSpots } from '../src/shopkeepers.js'
import { BUILDINGS } from '../src/town.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const base = { bag: {}, bagCount: 0, coins: 0, cheapest: 50, laser: 0, bombs: 0, tickets: 0, justSold: 0, best: null }
const L = (k, o) => lineFor(k, { ...base, ...o })
ok(BUILDINGS.every(b => KEEPERS[b.key] && KEEPERS[b.key].name && KEEPERS[b.key].look), 'every module has a keeper with a name and a look')
ok(new Set(Object.values(KEEPERS).map(k => k.name)).size === Object.keys(KEEPERS).length, 'each with a name of their own')
ok(/dig/.test(L('market', {})), 'Rita, with nothing to sell: go and dig')
ok(/42 coins/.test(L('market', { justSold: 42 })), 'and after a sale, says what it came to')
ok(/sparkle|think it is/.test(L('market', { best: 'stargem', bagCount: 3 })), 'a star gem in the bag gets a "wow"')
ok(/enough/.test(L('workshop', { coins: 60 })) && /20 more coins/.test(L('workshop', { coins: 30 })), 'Gizmo: you can afford one, or how many coins short you are')
ok(/Q/.test(L('bombs', {})) && /T/.test(L('bombs', { bombs: 2 })), 'Boomer teaches the keys: Q to throw, T for a ticket')
const all = []
for (const k of Object.keys(KEEPERS)) for (const o of [{}, { justSold: 9 }, { coins: 999 }, { bombs: 1, tickets: 1 }, { best: 'meteor', bagCount: 1 }]) for (const r of [0, 0.6]) all.push(L(k, { ...o }))
ok(all.every(s => s.length <= 70), `every line short enough for a child (longest ${Math.max(...all.map(s => s.length))} characters)`)
for (const b of BUILDINGS) {
  const s = keeperSpots(b), d = Math.hypot(s.keeper[0] - s.talk[0], s.keeper[2] - s.talk[2])
  if (!(d === 2)) { ok(false, `${b.key}: keeper two blocks beyond where you talk (${d})`); break }
}
ok(true, 'each keeper stands two blocks in from where you talk, across the counter')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
