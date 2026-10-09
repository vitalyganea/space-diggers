/* System 16 check: items and the backpack.   node tests/backpack.mjs */
import { ITEMS, Backpack, dropFor, START_CAPACITY } from '../src/items.js'
import { ID } from '../src/blocks.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
ok(dropFor(ID.gold_ore) === 'gold' && dropFor(ID.copper_ore) === 'copper' && dropFor(ID.moonrock) === null, 'ore drops its item, plain rock nothing')
let shards = 0; for (let i = 0; i < 1000; i++) if (dropFor(ID.crystal, i / 1000) === 'shard') shards++
ok(shards === 300, `crystal drops a shard 30% of the time (${shards}/1000)`)
const b = new Backpack()
ok(b.capacity === START_CAPACITY && b.count === 0, `starts empty with room for ${START_CAPACITY}`)
for (let i = 0; i < 18; i++) b.add('copper')
ok(b.add('gold') && b.add('stargem') && b.full && !b.add('titanium'), 'fills to 20 and then takes nothing more')
ok(b.value === 18 * 3 + 12 + 30, `worth ${b.value} at the Market`)
ok(b.take('copper', 3) && b.count === 17 && !b.take('titanium'), 'taking out works, and not what is not there')
const back = new Backpack(JSON.parse(JSON.stringify(b)).capacity, JSON.parse(JSON.stringify(b)).items)
ok(back.count === 17 && back.value === b.value, 'saves and loads back')
ok(new Backpack(20, { copper: 3, dragon: 9, titanium: -2 }).count === 3, 'unknown or negative items in a save are dropped')
ok(b.sellAll(1.5) === Math.round((15 * 3 + 12 + 30) * 1.5) && b.count === 0, 'selling empties it into coins (with a perk)')
ok(Object.values(ITEMS).every((it, i, a) => it.value > 0), 'every item is worth something')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
