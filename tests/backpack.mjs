/* System 16 check: items and the backpack.   node tests/backpack.mjs */
import { ITEMS, Backpack, dropFor, START_CAPACITY } from '../src/items.js'
import { ID } from '../src/blocks.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
ok(dropFor(ID.gold_ore) === 'gold' && dropFor(ID.coal_ore) === 'coal' && dropFor(ID.stone) === null, 'ore drops its item, plain rock nothing')
let shards = 0; for (let i = 0; i < 1000; i++) if (dropFor(ID.crystal, i / 1000) === 'shard') shards++
ok(shards === 300, `crystal drops a shard 30% of the time (${shards}/1000)`)
const b = new Backpack()
ok(b.capacity === START_CAPACITY && b.count === 0, `starts empty with room for ${START_CAPACITY}`)
for (let i = 0; i < 18; i++) b.add('coal')
ok(b.add('gold') && b.add('gem') && b.full && !b.add('iron'), 'fills to 20 and then takes nothing more')
ok(b.value === 18 * 2 + 12 + 25, `worth ${b.value} at the Market`)
ok(b.take('coal', 3) && b.count === 17 && !b.take('iron'), 'taking out works, and not what is not there')
const back = new Backpack(JSON.parse(JSON.stringify(b)).capacity, JSON.parse(JSON.stringify(b)).items)
ok(back.count === 17 && back.value === b.value, 'saves and loads back')
ok(new Backpack(20, { coal: 3, dragon: 9, iron: -2 }).count === 3, 'unknown or negative items in a save are dropped')
ok(b.sellAll(1.5) === Math.round((15 * 2 + 12 + 25) * 1.5) && b.count === 0, 'selling empties it into coins (with a perk)')
ok(Object.values(ITEMS).every((it, i, a) => it.value > 0), 'every item is worth something')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
