/* The round's world, as a pure function of (seed, x, y, z) -> block id.

   Layers by depth, from the surface at y = 0 down to the Core:
     grass, dirt to y -4, stone to -35, deep stone to -65, a basalt band
     with lava pockets to -85, crystal to -99, the Core from -100 down.
   Boundaries wobble a little so they do not look ruled. Ores sit in the
   layer that suits them, and small caves open in the stone layers.

   Fairness: players start LANE_GAP blocks apart along x. The layers are
   flat and thick, so every shaft goes through the same rock in the same
   order. Near each lane's straight shaft (within SHAFT_R) there are no
   random caves or lava; instead every lane gets the same two lava pockets
   at the same depths, an obstacle everyone has to dig around. Random lava
   and caves fill the rest. tests/worldgen.mjs measures the result. (A
   first version repeated the whole world every LANE_GAP blocks so the
   lanes were identical; it read as wallpaper and was dropped.) */
import { ID } from './blocks.js'
import { townVoxel, TOWN_R } from './town.js'

export const LANE_GAP = 10
export const LANES = 6
export const CORE_Y = -100
export const LAYERS = { dirt: -4, stone: -35, deep: -65, basalt: -85, crystal: -99 }
export const SHAFT_R = 3
/* The race arena: flat grass, no trees. Outside it the land rolls into low
   hills with trees, so the start looks like a place and not a test grid. */
export const ARENA = { x: 34, z: 10 }
/* The designed lava pockets under every lane: centre (relative to the lane
   centre), and radii. */
const POCKETS = [
  { c: [0, -70, 0], r: [2.6, 1.6, 2.6] },
  { c: [1, -79, -1], r: [3.2, 1.6, 2.4] },
]

/* Where lane i's player starts: lanes are centred on x = 0. */
export function laneX(i) { return (i - (LANES - 1) / 2) * LANE_GAP + 0.5 }

/* The nearest lane's centre column, and how far (x, z) is from it. */
function nearLane(x, z) {
  const i = Math.max(0, Math.min(LANES - 1, Math.round((x - laneX(0)) / LANE_GAP)))
  const cx = Math.floor(laneX(i))
  return { dx: x - cx, dist: Math.max(Math.abs(x - cx), Math.abs(z)) }
}

function hash(seed, x, y, z) {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/* Value noise on a lattice of `cell` blocks. */
function value3(seed, x, y, z, cell) {
  const fx = x / cell, fy = y / cell, fz = z / cell
  const x0 = Math.floor(fx), y0 = Math.floor(fy), z0 = Math.floor(fz)
  const tx = fx - x0, ty = fy - y0, tz = fz - z0
  const s = t => t * t * (3 - 2 * t)
  const ux = s(tx), uy = s(ty), uz = s(tz)
  const h = (i, j, k) => hash(seed, x0 + i, y0 + j, z0 + k)
  const lerp = (a, b, t) => a + (b - a) * t
  return lerp(
    lerp(lerp(h(0, 0, 0), h(1, 0, 0), ux), lerp(h(0, 1, 0), h(1, 1, 0), ux), uy),
    lerp(lerp(h(0, 0, 1), h(1, 0, 1), ux), lerp(h(0, 1, 1), h(1, 1, 1), ux), uy), uz)
}

/* Height of the ground at (x, z): 0 in the arena, rising gently into
   hills of up to 5 blocks past its edge. */
export function surfaceHeight(seed, x, z) {
  const out = Math.max(Math.abs(x) - ARENA.x, Math.abs(z) - ARENA.z, 0)
  if (out === 0) return 0
  const ramp = Math.min(1, out / 12)
  return Math.round(ramp * (value3(seed + 9, x, 0, z, 9) * 6 + value3(seed + 19, x, 0, z, 4) * 2 - 1.2))
}

/* A tree stands at (x, z) if the dice say so, outside the arena on level-ish
   ground. Trunk 4 or 5 logs, a leafy cap two blocks wide each side. */
function treeAt(seed, x, z) {
  if (Math.abs(x) <= ARENA.x + 2 && Math.abs(z) <= ARENA.z + 2) return 0
  if (hash(seed + 31, x, 0, z) > 0.009) return 0
  return 4 + Math.floor(hash(seed + 37, x, 1, z) * 2)
}

/* Two scales together, so shapes come out rounded instead of boxy. */
function noise3(seed, x, y, z, cell) {
  return 0.65 * value3(seed, x, y, z, cell) + 0.35 * value3(seed + 101, x + 17, y, z - 9, cell / 2.3)
}

/* { town: true } puts the town at the spawn (the open game); the race has none. */
export function makeWorld(seed = 1, { town = false } = {}) {
  const inTown = (x, z) => town && Math.abs(x) <= TOWN_R + 4 && Math.abs(z) <= TOWN_R + 4
  function above(x, y, z) {
    if (town) { const t = townVoxel(x, y, z); if (t !== -1) return t }
    const h = inTown(x, z) ? 0 : surfaceHeight(seed, x, z)
    if (y < h) return ID.dust
    if (y === h) return ID.regolith
    // trees: a trunk here, or leaves from a trunk within two blocks
    const trunk = inTown(x, z) ? 0 : treeAt(seed, x, z)
    if (trunk && y > h && y <= h + trunk) return ID.ice
    if (y > h + 6 + 3) return 0
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      const t = inTown(x + dx, z + dz) ? 0 : treeAt(seed, x + dx, z + dz)
      if (!t) continue
      const top = (inTown(x + dx, z + dz) ? 0 : surfaceHeight(seed, x + dx, z + dz)) + t
      const r = y > top ? 1 : 2                       // the cap narrows at the top
      if (y >= top - 1 && y <= top + 1 && Math.abs(dx) <= r && Math.abs(dz) <= r &&
          !(Math.abs(dx) === 2 && Math.abs(dz) === 2) && !(dx === 0 && dz === 0 && y <= top)) return ID.frost
    }
    return 0
  }

  return function voxel(x, y, z) {
    if (y <= CORE_Y) return ID.core
    if (y >= 0) return above(x, y, z)
    // a gently wobbling dirt/stone line
    const wob = Math.floor(noise3(seed + 1, x, 0, z, 5) * 3) - 1   // -1..1
    const r = hash(seed + 7, x, y, z)                              // per-block dice
    const lane = nearLane(x, z), inShaft = lane.dist <= SHAFT_R

    if (y > LAYERS.dirt + wob) return ID.dust

    // caves: hollow where a slow noise runs high, only in stone and deep stone,
    // and never in the top of anyone's shaft
    if (!inShaft && y < LAYERS.dirt - 3 && y > LAYERS.deep) {
      const c = noise3(seed + 3, x, y, z, 7)
      if (c > 0.74) return 0
    }
    if (y > LAYERS.stone + wob) {
      if (r < 0.03) return ID.copper_ore
      if (y < -15 && r < 0.045) return ID.titanium_ore
      return ID.moonrock
    }
    if (y > LAYERS.deep + wob) {
      if (r < 0.015) return ID.gold_ore
      if (y < -50 && r < 0.023) return ID.stargem_ore
      if (r < 0.04) return ID.titanium_ore
      return ID.darkrock
    }
    if (y > LAYERS.basalt + wob) {
      // lava pockets: blobs you have to dig around
      if (inShaft) {
        for (const p of POCKETS) {
          const u = (lane.dx - p.c[0]) / p.r[0], v = (y - p.c[1]) / p.r[1], w = (z - p.c[2]) / p.r[2]
          if (u * u + v * v + w * w <= 1) return ID.lava
        }
      } else if (noise3(seed + 5, x, y, z, 6) > 0.7) return ID.lava
      if (r < 0.02) return ID.stargem_ore
      return ID.basalt
    }
    if (r < 0.03) return ID.stargem_ore
    return ID.crystal
  }
}
