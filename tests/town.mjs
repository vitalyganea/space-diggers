/* System 19 check: the town in the world.   node tests/town.mjs */
import { World } from '../src/world.js'
import { BUILDINGS, doors, doorNear, TOWN_R } from '../src/town.js'
import { ID, byId } from '../src/blocks.js'
import { blast } from '../src/blast.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const w = new World(5, { town: true }), plain = new World(5)
ok(w.get(0, 0, 0) === ID.deck && w.get(0, 1, 0) === 0, 'the spawn stands on cobbles in open air')
ok(plain.get(0, 0, 0) === ID.regolith, 'the race world has no town')
for (const b of BUILDINGS) {
  const [x, z] = b.at, [fx, fz] = b.face
  const door = [w.get(x, 1, z), w.get(x, 2, z)], wall = w.get(x + 2 * -fz, 3, z + 2 * fx)
  const roof = w.get(x - 3 * fx, 5, z - 3 * fz)
  ok(door.every(v => v === 0) && wall === b.wall && roof === ID.solar && w.get(x + fx, 3, z + fz) === b.awning,
     `${b.name}: a doorway, walls, a roof, its awning`)
}
let trees = 0, unbreakable = true
for (let x = -TOWN_R; x <= TOWN_R; x++) for (let z = -TOWN_R; z <= TOWN_R; z++) {
  for (let y = 0; y < 9; y++) { const id = w.get(x, y, z); if (id === ID.ice) trees++; if (id && byId[id].hard < 50 && y >= 0 && (Math.abs(x) <= 16 && Math.abs(z) <= 16)) unbreakable = false }
}
ok(trees === 0, 'no trees in town')
ok(unbreakable, 'nothing in the town square can be dug')
const before = w.get(0, 3, 9 + 3)
const res = blast(w, [0.5, 3, 9.5])
ok(res.broken.length === 0 && w.get(0, 3, 12) === before, 'a bomb in town breaks nothing')
ok(doors().length === 6 && doors().every(d => w.get(Math.floor(d.pos[0]), 1, Math.floor(d.pos[2])) === 0), 'six doors, each with clear ground in front')
ok(doorNear([0.5, 1, 7.6]).key === 'market' && doorNear([0.5, 1, 0.5]) === null, 'standing by the Market door finds it; the middle of the square finds none')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
