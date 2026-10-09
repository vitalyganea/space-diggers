/* The Ice Moon (row 58), the first planet by rocket: a small moon of the
   ringed planet, cold and bright. The outpost stands on a flat plain at
   the spawn; past it snow lies in soft dunes, cut by crevasses, with
   spikes of ice standing up out of it. Under it, from the top:
     snow, frost to y -3, clear ice to -20, packed blue ice to -50, dark
     rock with ice caves to -85, crystal to -99, the Core.
   Ore in veins as on the Moon, its own: cold silver near the top, frost
   gems deep, with titanium, helium and gold. Worth more than the Moon's. */
import { ID } from './blocks.js'
import { hash, value3, noise3, veinCell, VEIN_CELL, CORE_Y } from './worldgen.js'
import { townVoxel, TOWN_R } from './town.js'

export const ICE = { frost: -3, clear: -20, packed: -50, dark: -85, crystal: -99, plain: TOWN_R + 6 }
const VEINS = [
  { id: ID.coldsilver_ore, from: -2, to: -50, weight: 5 },
  { id: ID.titanium_ore, from: -10, to: -60, weight: 2.5 },
  { id: ID.frostgem_ore, from: -30, to: -99, weight: 2 },
  { id: ID.helium_ore, from: -50, to: -90, weight: 3 },
  { id: ID.gold_ore, from: -40, to: -99, weight: 2 },
]

export function iceHeight(seed, x, z) {
  const out = Math.hypot(x, z) - ICE.plain
  if (out <= 0) return 0
  const ramp = Math.min(1, out / 8)
  let h = ramp * (value3(seed + 9, x, 0, z, 14) * 5 + value3(seed + 19, x, 0, z, 6) * 2 - 2.2)
  // crevasses: narrow cracks where a slow noise crosses its middle
  const c = value3(seed + 29, x, 0, z, 18)
  if (Math.abs(c - 0.5) < 0.018 && out > 6) h -= 6
  return Math.round(h)
}

export function makeIce(seed = 1) {
  const clear = (x, z) => Math.hypot(x, z) <= ICE.plain + 2
  const heights = new Map()
  const ground = (x, z) => {
    const k = x * 100003 + z
    let h = heights.get(k)
    if (h === undefined) { h = iceHeight(seed, x, z); if (heights.size > 200000) heights.clear(); heights.set(k, h) }
    return h
  }
  const veinCache = new Map()
  const veinAt = (x, y, z) => {
    const N = VEIN_CELL, i = Math.floor(x / N), j = Math.floor(y / N), k = Math.floor(z / N)
    const key = (i * 4099 + j) * 4099 + k
    let c = veinCache.get(key)
    if (c === undefined) { c = veinCell(seed + 500, i, j, k, VEINS); if (veinCache.size > 100000) veinCache.clear(); veinCache.set(key, c) }
    return c ? c[((y - j * N) * N + (z - k * N)) * N + (x - i * N)] : 0
  }
  const caveAt = (x, y, z) => y < ICE.clear - 2 && y > ICE.crystal + 2 && noise3(seed + 3, x, y, z, 8) > (y < ICE.packed ? 0.7 : 0.77)
  // spikes of ice: one block wide, 2 to 5 high
  const spike = (x, z) => !clear(x, z) && hash(seed + 41, x, 0, z) < 0.004 ? 2 + Math.floor(hash(seed + 42, x, 1, z) * 4) : 0

  return function voxel(x, y, z) {
    if (y <= CORE_Y) return ID.core
    const t = townVoxel(x, y, z)
    if (t !== -1 && y >= 0) return t
    const h = ground(x, z)
    if (y > h) { const s = spike(x, z); return s && y <= h + s ? ID.ice : 0 }
    if (y === h) return ID.snow
    const wob = Math.floor(noise3(seed + 1, x, 0, z, 5) * 3) - 1
    const top = Math.min(h, 0)
    if (y > top + ICE.frost + wob) return ID.frost
    if (caveAt(x, y, z)) return 0
    if (y < top - 1) { const v = veinAt(x, y, z); if (v) return v }
    if (y > ICE.clear + wob) return ID.ice
    if (y > ICE.packed + wob) return ID.packed_ice
    if (y > ICE.dark + wob) {
      if (caveAt(x, y + 1, z) || caveAt(x + 1, y, z) || caveAt(x - 1, y, z) || caveAt(x, y, z + 1) || caveAt(x, y, z - 1)) return ID.ice   // cave walls of ice
      return ID.darkrock
    }
    return ID.crystal
  }
}
