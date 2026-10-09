/* Bombs and blocks, the rules (no noa here; src/bombs.js puts them on screen).

   A blast removes every block within BLAST_R of its centre except lava and
   the Core, and pays the coins of any ore it took. Racers within KNOCK_R
   are thrown up and dazed for DAZE seconds; nobody is hurt.

   Digging earth or rock puts one block of rubble in your stock (at most
   MAX_STOCK); a placed block of rubble plugs a shaft. */
import { byId, ID } from './blocks.js'

export const BLAST_R = 2.3
export const KNOCK_R = 3.5
export const DAZE = 2
export const FUSE = 2
export const MAX_STOCK = 30
const KEEP = new Set([ID.lava, ID.core])
const STOCKABLE = new Set([ID.grass, ID.dirt, ID.stone, ID.deepstone, ID.basalt, ID.crystal, ID.rubble])

export function blast(world, c) {
  const broken = []
  let coins = 0
  const r = Math.ceil(BLAST_R)
  for (let x = Math.floor(c[0]) - r; x <= Math.floor(c[0]) + r; x++)
    for (let y = Math.floor(c[1]) - r; y <= Math.floor(c[1]) + r; y++)
      for (let z = Math.floor(c[2]) - r; z <= Math.floor(c[2]) + r; z++) {
        const d = Math.hypot(x + 0.5 - c[0], y + 0.5 - c[1], z + 0.5 - c[2])
        const id = world.get(x, y, z)
        if (d > BLAST_R || id === 0 || KEEP.has(id) || (byId[id] && byId[id].hard >= 50)) continue   // lava, the Core, the town
        world.set(x, y, z, 0)
        coins += byId[id] ? byId[id].coins : 0
        broken.push({ pos: [x, y, z], id })
      }
  return { broken, coins }
}

/* Who a blast at c reaches: racers as { pos }, returns those within KNOCK_R. */
export function knocked(c, racers) {
  return racers.filter(r => Math.hypot(r.pos[0] - c[0], r.pos[1] + 0.8 - c[1], r.pos[2] - c[2]) <= KNOCK_R)
}

export function stocks(id) { return STOCKABLE.has(id) }
