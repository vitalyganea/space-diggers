/* System 11 check: payouts, the animal shop, perks and the save.   node tests/meta.mjs */
import { defaults, load, store, payout, afterRound, buy, choose, perk, SHOP, KEY } from '../src/meta.js'
import { ID } from '../src/blocks.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), m } }

const s0 = load(mem())
ok(s0.coins === 0 && s0.owned.join() === 'mole' && s0.chosen === 'mole', 'a new player: no coins, the mole')
const win = { place: 1, depth: 99, finishedAt: 150 }, sixth = { place: 6, depth: 31, finishedAt: null }
ok(payout(win, 12).total === 12 + 50 + 49, `a win pays purse + 50 + depth/2 (${payout(win, 12).total})`)
ok(payout(sixth, 0).total === 10 + 15, `sixth pays 10 + depth/2 (${payout(sixth, 0).total})`)
const s = defaults()
afterRound(s, win, 12); afterRound(s, sixth, 0)
ok(s.coins === 136 && s.rounds === 2 && s.wins === 1 && s.bestDepth === 99, `the save adds it up (${JSON.stringify(s)})`)
ok(!buy(s, 'hamster') && s.coins === 136, 'too dear: nothing bought')
s.coins = 800
ok(buy(s, 'beaver') && s.coins === 500 && s.owned.includes('beaver'), 'the beaver for 300')
ok(!buy(s, 'beaver') && s.coins === 500, 'not twice')
ok(!choose(s, 'hamster') && choose(s, 'beaver') && s.chosen === 'beaver', 'you can only dig as an animal you own')
const st = mem(); store(st, s)
const back = load(st)
ok(JSON.stringify(back) === JSON.stringify(s), 'the save comes back as it went in')
st.setItem(KEY, '{"coins":-5,"owned":["mole","dragon","hamster"],"chosen":"dragon"}')
const odd = load(st)
ok(odd.coins === 0 && odd.owned.join() === 'mole,hamster' && odd.chosen === 'mole', 'a strange save is cleaned, not trusted')
st.setItem(KEY, '{nope'); ok(load(st).coins === 0, 'a broken save starts fresh')

const m = perk('mole'), b = perk('beaver'), h = perk('hamster')
ok(m.digSpeed(ID.stone) === 1.15 && m.digSpeed(ID.deepstone) === 1 && m.coinMult === 1, 'mole: earth and stone faster, nothing else')
ok(b.startBombs === 1 && b.startStock === 10 && b.digSpeed(ID.stone) === 1, 'beaver: a bomb and 10 blocks to start')
ok(h.coinMult === 1.5 && h.digSpeed(ID.stone) === 1 && h.startBombs === 0, 'hamster: ore pays half again')
ok(new Set(SHOP.map(x => x.perk)).size === SHOP.length, 'every animal\'s perk is its own')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
