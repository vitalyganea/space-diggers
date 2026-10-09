/* System 20 check: the Workshop's upgrades.   node tests/gear.mjs */
import { GEAR, loadGear, value, nextCost, buy, defaultGear } from '../src/gear.js'
import { ITEMS } from '../src/items.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const g = defaultGear()
ok(value(g, 'drill') === 1 && value(g, 'battery') === 100 && value(g, 'backpack') === 20, 'starts with the basics')
const purse = { coins: 45 }
ok(!buy(g, 'drill', purse) && purse.coins === 45, 'too poor: nothing')
purse.coins = 100
ok(buy(g, 'drill', purse) && value(g, 'drill') === 1.3 && purse.coins === 50, 'the second drill for 50')
for (const [k, d] of Object.entries(GEAR)) {
  ok(d.levels.every((v, i) => i === 0 || v > d.levels[i - 1]) && d.cost.every((c, i) => i === 0 || c > d.cost[i - 1]), `${d.name}: every level better and dearer`)
}
const rich = { coins: 1e6 }
while (buy(g, 'lamp', rich)) {}
ok(nextCost(g, 'lamp') === null && value(g, 'lamp') === 24, 'the lamp tops out at 24')
ok(JSON.stringify(loadGear({ drill: 99, battery: -3, lamp: 'x' })) === JSON.stringify({ drill: 5, battery: 0, backpack: 0, lamp: 0 }), 'a save is clamped to what exists')
// pacing: a full backpack of mixed early ore pays about the first upgrade
const early = 20 * (0.6 * ITEMS.copper.value + 0.4 * ITEMS.titanium.value)
ok(early >= GEAR.drill.cost[1] * 0.8 && early <= GEAR.drill.cost[1] * 2, `a first full backpack (~${early.toFixed(0)}) about pays the second drill (${GEAR.drill.cost[1]})`)
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
