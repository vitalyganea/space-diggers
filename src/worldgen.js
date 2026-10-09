/* The worlds, as pure functions of (seed, x, y, z) -> block id: the race's
   (makeWorld) and, for the open game, the Moon (makeMoon, row 27, below).

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
/* The race arena: flat regolith. Outside it the land rolls into low hills
   with boulders, so the start looks like a place and not a test grid. */
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

/* A boulder sits at (x, z) if the dice say so, outside `clear(x, z)`:
   a lump of moon rock 1–3 blocks high, rounded off at the top. Its centre
   column is the tallest; neighbours within its radius are a block lower
   per block out. Returns the boulder's top above the ground, 0 for none. */
function boulderAt(seed, x, z, clear) {
  // the clear areas are convex: if all four corners of the reach are in one, so is the rest
  if (clear(x - 2, z - 2) && clear(x + 2, z + 2) && clear(x - 2, z + 2) && clear(x + 2, z - 2)) return 0
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    const cx = x + dx, cz = z + dz
    if (clear(cx, cz) || hash(seed + 31, cx, 0, cz) > 0.006) continue
    const size = 1 + Math.floor(hash(seed + 37, cx, 1, cz) * 3)            // 1..3
    const d = Math.max(Math.abs(dx), Math.abs(dz))
    if (d < size) return size - d
  }
  return 0
}

/* Two scales together, so shapes come out rounded instead of boxy. */
function noise3(seed, x, y, z, cell) {
  return 0.65 * value3(seed, x, y, z, cell) + 0.35 * value3(seed + 101, x + 17, y, z - 9, cell / 2.3)
}

/* The race's world; { town: true } asks for the open game's, which is the
   Moon with the base at the spawn. */
export function makeWorld(seed = 1, { town = false } = {}) {
  if (town) return makeMoon(seed)
  const clear = (x, z) => Math.abs(x) <= ARENA.x + 2 && Math.abs(z) <= ARENA.z + 2
  function above(x, y, z) {
    const h = surfaceHeight(seed, x, z)
    if (y < h) return ID.dust
    if (y === h) return ID.regolith
    const b = y <= h + 3 ? boulderAt(seed, x, z, clear) : 0
    if (b && y <= h + b) return ID.moonrock
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

/* ------------------------------------------------------------------ the Moon

   The open game's world (row 27). The base sits on a flat plain at the
   spawn; past it the ground rolls gently and is pocked with craters, with
   boulders lying about. Under it, from the top:
     regolith, dust to y -4, moon rock to -35, dark rock to -65, the ice
     caves to -85 (caves walled in ice and frost, helium ore in the walls),
     crystal to -99, and the Core from -100: the bottom, for now.
   Meteorite craters (row 39): about one big crater in four, where a lens
   of very hard, black meteorite rock breaks the bowl's floor, an eighth of
   it meteoric iron (the dearest ore) and some star gems.
   No lava (the race's lava pockets got in the way eight times in eight
   minutes of the first playtest, for no reward).

   Ore comes in veins of 3–8 blocks: the rock is cut into 4×4×4 cells and
   most cells hold one vein, a short random walk kept inside its cell, of
   an ore that suits the depth. They show in tunnel walls and are worth
   turning aside for. tests/moon.mjs measures how much a straight shaft
   meets and how much shows in its walls. (A first try, ore where a fine
   noise ran high, gave single blocks and blobs of over a hundred.) */
export const MOON = { dust: -4, rock: -35, dark: -65, ice: -85, crystal: -99, plain: TOWN_R + 14 }
/* Each ore: the depths it is found at (y from, y to) and how often, against
   the others there. Copper near the top, titanium through the rock, gold
   and star gems deep, helium in the ice. */
const VEINS = [
  { id: ID.copper_ore, from: -2, to: -40, weight: 5 },
  { id: ID.titanium_ore, from: -12, to: -66, weight: 4 },
  { id: ID.gold_ore, from: -34, to: -90, weight: 3 },
  { id: ID.stargem_ore, from: -55, to: -99, weight: 1.5 },
  { id: ID.helium_ore, from: -64, to: -88, weight: 3 },
]
export const VEIN_CELL = 4
const VEIN_CHANCE = 0.85
const STEPS = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]]   // flatter than tall

/* The vein in cell (i, j, k), as 64 block ids (0 for none), or null. */
function veinCell(seed, i, j, k) {
  if (hash(seed + 81, i, j, k) > VEIN_CHANCE) return null
  const N = VEIN_CELL, y0 = j * N + N / 2
  const here = VEINS.filter(v => y0 <= v.from && y0 >= v.to)
  if (!here.length) return null
  let pick = hash(seed + 82, i, j, k) * here.reduce((a, v) => a + v.weight, 0), ore = here[0]
  for (const v of here) { if (pick < v.weight) { ore = v; break } pick -= v.weight }
  const cells = new Uint8Array(N * N * N)
  const len = 3 + Math.floor(hash(seed + 83, i, j, k) * 6)                 // 3..8
  let x = 1 + Math.floor(hash(seed + 84, i, j, k) * 2), y = 1 + Math.floor(hash(seed + 85, i, j, k) * 2), z = 1 + Math.floor(hash(seed + 86, i, j, k) * 2)
  let n = 0
  for (let s = 0; n < len && s < 40; s++) {
    const at = (y * N + z) * N + x
    if (!cells[at]) { cells[at] = ore.id; n++ }
    const [dx, dy, dz] = STEPS[Math.floor(hash(seed + 87 + s, i, j, k) * STEPS.length)]
    x = Math.max(0, Math.min(N - 1, x + dx)); y = Math.max(0, Math.min(N - 1, y + dy)); z = Math.max(0, Math.min(N - 1, z + dz))
  }
  return cells
}
const CRATER_CELL = 26

/* The crater whose cell holds (x, z), if any: { cx, cz, r }. One at most
   per cell, kept off the plain round the base. */
function craterIn(seed, i, j) {
  if (hash(seed + 61, i, 0, j) > 0.55) return null
  const cx = Math.floor((i + 0.2 + hash(seed + 62, i, 1, j) * 0.6) * CRATER_CELL)
  const cz = Math.floor((j + 0.2 + hash(seed + 63, i, 2, j) * 0.6) * CRATER_CELL)
  const r = 4 + hash(seed + 64, i, 3, j) * 6
  if (Math.hypot(cx, cz) < MOON.plain + r + 2) return null
  // about one big crater in four is where a meteorite struck (row 39)
  return { cx, cz, r, meteor: r >= 6 && hash(seed + 65, i, 4, j) < 0.3 }
}

/* The meteorite craters within `range` blocks of (x, z): { cx, cz, r }. */
export function meteorCraters(seed, x, z, range) {
  const out = []
  const i0 = Math.floor((x - range) / CRATER_CELL), i1 = Math.floor((x + range) / CRATER_CELL)
  const j0 = Math.floor((z - range) / CRATER_CELL), j1 = Math.floor((z + range) / CRATER_CELL)
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const c = craterIn(seed, i, j)
    if (c && c.meteor) out.push(c)
  }
  return out
}

/* Ground height on the Moon: flat on the plain, gentle rolls past it, and
   craters pressed in, a bowl a third as deep as it is wide with a raised rim. */
export function moonHeight(seed, x, z) {
  const out = Math.hypot(x, z) - MOON.plain
  if (out <= 0) return 0
  const ramp = Math.min(1, out / 10)
  let h = ramp * (value3(seed + 9, x, 0, z, 11) * 4 + value3(seed + 19, x, 0, z, 5) * 1.5 - 1.6)
  const i = Math.floor(x / CRATER_CELL), j = Math.floor(z / CRATER_CELL)
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    const c = craterIn(seed, i + di, j + dj)
    if (!c) continue
    const d = Math.hypot(x - c.cx, z - c.cz) / c.r
    if (d < 1) h -= c.r * 0.38 * (1 - d * d)                     // the bowl
    else if (d < 1.4) h += 1.2 * (1 - Math.abs(d - 1.15) / 0.25) // the rim
  }
  return Math.round(h)
}

export function makeMoon(seed = 1) {
  const onPlain = (x, z) => Math.hypot(x, z) <= MOON.plain + 3     // a boulder reaches 2 blocks from its centre
  const heights = new Map()
  const ground = (x, z) => {
    const k = x * 100003 + z
    let h = heights.get(k)
    if (h === undefined) { h = moonHeight(seed, x, z); if (heights.size > 200000) heights.clear(); heights.set(k, h) }
    return h
  }
  const veinCache = new Map()
  const veinAt = (x, y, z) => {
    const N = VEIN_CELL, i = Math.floor(x / N), j = Math.floor(y / N), k = Math.floor(z / N)
    const key = (i * 4099 + j) * 4099 + k
    let c = veinCache.get(key)
    if (c === undefined) { c = veinCell(seed, i, j, k); if (veinCache.size > 100000) veinCache.clear(); veinCache.set(key, c) }
    return c ? c[((y - j * N) * N + (z - k * N)) * N + (x - i * N)] : 0
  }
  // meteorite craters: under each, a lens of meteorite rock that breaks the surface of the bowl
  const meteorCol = new Map()
  const meteorUnder = (x, z) => {
    const k = x * 100003 + z
    if (meteorCol.has(k)) return meteorCol.get(k)
    let hit = null
    const i = Math.floor(x / CRATER_CELL), j = Math.floor(z / CRATER_CELL)
    for (let di = -1; di <= 1 && !hit; di++) for (let dj = -1; dj <= 1 && !hit; dj++) {
      const c = craterIn(seed, i + di, j + dj)
      if (c && c.meteor && Math.hypot(x - c.cx, z - c.cz) < c.r * 0.8) hit = { ...c, bottom: ground(c.cx, c.cz) }
    }
    if (meteorCol.size > 200000) meteorCol.clear()
    meteorCol.set(k, hit)
    return hit
  }
  const caveAt = (x, y, z) => y < MOON.dust - 3 && y > MOON.crystal + 2 &&
    noise3(seed + 3, x, y, z, y < MOON.dark ? 8 : 7) > (y < MOON.dark && y > MOON.ice ? 0.68 : 0.75)

  return function voxel(x, y, z) {
    if (y <= CORE_Y) return ID.core
    const t = townVoxel(x, y, z)
    if (t !== -1 && y >= 0) return t
    const h = ground(x, z)
    if (y > h) {
      const b = y <= h + 3 ? boulderAt(seed, x, z, onPlain) : 0
      return b && y <= h + b ? ID.moonrock : 0
    }
    if (y > h - 12 && y > -16) {
      const m = meteorUnder(x, z)
      if (m) {
        const dxz = Math.hypot(x - m.cx, z - m.cz) / (m.r * 0.8), dy = (y - (m.bottom - 1)) / 5
        if (dxz * dxz + dy * dy <= 1) {
          const r = hash(seed + 91, x, y, z)
          return r < 0.12 ? ID.meteor_ore : r < 0.15 ? ID.stargem_ore : ID.meteorite
        }
      }
    }
    if (y === h) return ID.regolith
    const wob = Math.floor(noise3(seed + 1, x, 0, z, 5) * 3) - 1   // -1..1, so the lines do not look ruled
    if (y > Math.min(h, 0) + MOON.dust + wob) return ID.dust
    const iceLayer = y <= MOON.dark + wob && y > MOON.ice + wob
    if (caveAt(x, y, z)) return 0
    // walls of the ice caves: ice, frost on the floors
    if (iceLayer && (caveAt(x, y + 1, z) || caveAt(x + 1, y, z) || caveAt(x - 1, y, z) || caveAt(x, y, z + 1) || caveAt(x, y, z - 1)))
      return caveAt(x, y + 1, z) && hash(seed + 71, x, y, z) < 0.6 ? ID.frost : ID.ice
    if (y < Math.min(h, 0) - 1) { const v = veinAt(x, y, z); if (v) return v }
    if (y > MOON.rock + wob) return ID.moonrock
    if (y > MOON.dark + wob) return ID.darkrock
    if (iceLayer) return hash(seed + 7, x, y, z) < 0.08 ? ID.ice : ID.darkrock
    return ID.crystal
  }
}
