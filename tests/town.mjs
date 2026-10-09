/* System 19 check: the town in the world.   node tests/town.mjs */
import { World } from '../src/world.js'
import { BUILDINGS, PAD, doors, doorNear, TOWN_R } from '../src/town.js'
import { ID, byId } from '../src/blocks.js'
import { blast } from '../src/blast.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const w = new World(5, { town: true }), plain = new World(5)
ok(w.get(0, 0, 0) === ID.charger && w.get(0, 1, 0) === 0, 'the spawn stands on the charging pad in open air')
ok(plain.get(0, 0, 0) === ID.regolith, 'the race world has no town')
for (const b of BUILDINGS) {
  const [x, z] = b.at, [fx, fz] = b.face
  const door = [w.get(x, 1, z), w.get(x, 2, z)], wall = w.get(x + 2 * -fz, 3, z + 2 * fx)
  const dome = w.get(x - 3 * fx, 7, z - 3 * fz), under = w.get(x - 3 * fx, 6, z - 3 * fz)
  ok(door.every(v => v === 0) && wall === ID.hull && w.get(x + 2 * -fz, 4, z + 2 * fx) === b.band && w.get(x + fx, 3, z + fz) === b.band,
     `${b.name}: a doorway, white walls, its colour over the door and round the top`)
  ok(dome === ID.glass && under === 0, `${b.name}: a glass dome on top, hollow`)
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
// the launch pad and its rocket, west on the plain
const [px, pz] = PAD.at
let tall = 0; for (let y = 1; y < 18; y++) if (w.get(px, y, pz) !== 0) tall = y
ok(w.get(px, 0, pz) === ID.deck && w.get(px + 5, 0, pz) === ID.light_yellow && tall >= 15, `a round pad with a rocket ${tall} blocks tall`)
ok(w.get(px, 15, pz) === ID.light_red && w.get(px + 2, 9, pz) === ID.glass && w.get(px + 4, 1, pz) === ID.light_red && w.get(px, 1, pz - 4) === ID.light_red, 'red nose, a window, red fins')
let solar = 0; for (let x = -TOWN_R; x <= TOWN_R; x++) for (let z = -TOWN_R; z <= TOWN_R; z++) if (w.get(x, 2, z) === ID.solar) solar++
ok(solar >= 40, `solar panels in the base (${solar})`)
ok(doors().length === 7 && doors().every(d => w.get(Math.floor(d.pos[0]), 1, Math.floor(d.pos[2])) === 0), 'seven doors (five modules, the portal, the pad), each with clear ground in front')
ok(doorNear([0.5, 1, 11.4]).key === 'market' && doorNear([0.5, 1, 0.5]) === null, 'standing at the Trade Hub\'s counter finds it; the middle of the square finds none')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
