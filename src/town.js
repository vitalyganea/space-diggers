/* The space base at the spawn (row 28): a deck of metal plates with five
   modules round it, the race portal, two rows of solar panels, and west of
   it all a launch pad with a rocket standing on it. All of blocks that
   cannot be dug (src/blocks.js, hard 99). The Moon asks townVoxel(x, y, z)
   first.

   A module is described by the middle of its front wall (at), the way its
   door faces (toward the middle), and its colour: a lit band over the door
   and round the top of its white walls, so each reads from across the
   base. A glass dome sits on top. Local u runs along the front, v runs
   from the front wall (0) back into the module. */
import { ID } from './blocks.js'

/* Where a new player starts and a ticket home lands: the charging pad. */
export const SPAWN = [0.5, 1, 0.5]
export const TOWN_R = 18          // the base's deck reaches about this far
export const SQUARE_R = 16

const MOON_BUILDINGS = [
  { key: 'market', name: 'Trade Hub', at: [0, 9], face: [0, -1], band: ID.light_green, ready: true },
  { key: 'workshop', name: 'Workshop', at: [9, 0], face: [-1, 0], band: ID.light_yellow, ready: true },
  { key: 'bombs', name: 'Bomb Shop', at: [-9, 0], face: [1, 0], band: ID.light_red, ready: true },
  { key: 'museum', name: 'Museum', at: [0, -9], face: [0, 1], band: ID.light_blue, ready: true },
  { key: 'robots', name: 'Robot Bay', at: [-9, 12], face: [1, 0], band: ID.light_purple, ready: true },
]
/* The race portal: a metal frame round a purple gateway, not a building. */
const MOON_PORTAL = { key: 'portal', name: 'Race portal', at: [9, -12], face: [-1, 0], ready: true }
/* Planets (row 55): the Moon has the whole base; anywhere else the rocket
   lands at a small outpost: a Trade Hub with its own keeper, a charging pad,
   the launch pad close by. setPlanet() picks one, once, as the game starts
   (a trip by rocket reloads the page). */
export let PLANET = 'moon'
const OUTPOST = { key: 'outpost', name: 'Trade Hub', at: [0, 7], face: [0, -1], band: ID.light_green, ready: true, shop: 'market' }
export const BUILDINGS = [...MOON_BUILDINGS]
export let PORTAL = MOON_PORTAL
let square = 16
/* The launch pad, west on the plain: a round pad with the rocket on it.
   Other planets, by rocket, are stage 4; its door is round its east side. */
export const PAD = { key: 'pad', name: 'Launch Pad', at: [-26, 0], r: 5, door: [-19.5, 1, 0.5], ready: true, face: [1, 0] }
export function setPlanet(p) {
  PLANET = p
  BUILDINGS.length = 0
  if (p === 'moon') { BUILDINGS.push(...MOON_BUILDINGS); PORTAL = MOON_PORTAL; PAD.at = [-26, 0]; PAD.door = [-19.5, 1, 0.5]; square = 16 }
  else { BUILDINGS.push(OUTPOST); PORTAL = null; PAD.at = [-13, 0]; PAD.door = [-6.5, 1, 0.5]; square = 9 }
}
/* Solar panels: rows of them in the two empty corners of the base. */
const SOLAR = [{ x: [8, 15], z: [7, 15] }, { x: [-15, -8], z: [-15, -7] }]

const W = 3, D = 6, H = 4        // half-width, depth, wall height

function local(b, x, z) {
  const [fx, fz] = b.face, rx = -fz, rz = fx
  const dx = x - b.at[0], dz = z - b.at[1]
  return { u: dx * rx + dz * rz, v: -(dx * fx + dz * fz) }
}

function buildingVoxel(b, x, y, z) {
  const { u, v } = local(b, x, z)
  if (v === -1 && Math.abs(u) <= 1 && y === 3) return b.band                  // the lit sign over the door
  if (Math.abs(u) > W || v < 0 || v > D) return -1
  if (y === 0) return ID.floor
  if (y > H) {                                                                // the glass dome
    const du = u / (W + 0.5), dv = (v - D / 2) / (D / 2 + 0.5), dy = (y - H) / 3.2
    const r = du * du + dv * dv + dy * dy
    if (r > 1) return 0
    const iu = u / (W - 0.5), iv = (v - D / 2) / (D / 2 - 0.5), iy = (y - H) / 2.2
    return iu * iu + iv * iv + iy * iy > 1 ? ID.glass : 0
  }
  const front = v === 0, back = v === D, side = Math.abs(u) === W
  if (y === H) return front || back || side ? b.band : ID.hull                // a lit band round the top, a ceiling inside
  if (v === 3 && Math.abs(u) <= 2 && y === 1) return b.band                   // the shop counter, in the module's colour (row 46)
  if (!(front || back || side)) return 0                                      // inside
  if (front && u === 0 && y <= 2) return 0                                    // the door
  if (y === 2 && ((front && Math.abs(u) === 2) || (side && (v === 2 || v === 4)))) return ID.glass
  return ID.hull
}

/* The rocket on its pad: a round white body five blocks across, red bands,
   a nose that narrows to a point, four red fins at the foot, a window
   looking east at the base. Built round the block at the pad's middle. */
function rocketVoxel(x, y, z) {
  const dx = x - PAD.at[0], dz = z - PAD.at[1], d = Math.hypot(dx, dz)
  if (d > PAD.r + 0.5 || y < 0 || y > 18) return -1
  if (y === 0) return d > PAD.r - 0.5 ? ID.light_yellow : ID.deck           // a yellow ring round the pad
  const body = y <= 11 ? 2.3 : y <= 13 ? 1.5 : y <= 15 ? 1 : y <= 17 ? 0.1 : -1
  if (d <= body) {
    if (y >= 12) return ID.light_red
    if ((y === 8 || y === 9) && dx === 2 && dz === 0) return ID.glass
    if (y === 1) return ID.floor                                              // the engine
    return y === 5 || y === 11 ? ID.light_red : ID.hull
  }
  const onAxis = dx === 0 || dz === 0
  if (onAxis && y <= 4 && d <= (y <= 2 ? 4 : 3)) return ID.light_red         // the fins
  return 0
}

function solarVoxel(x, y, z) {
  if (PLANET !== 'moon') return -1
  for (const s of SOLAR) {
    if (x < s.x[0] || x > s.x[1] || z < s.z[0] || z > s.z[1]) continue
    const row = (z - s.z[0]) % 3
    if (row === 2) return y === 0 ? ID.deck : -1                              // a walkway between rows
    if (y === 1) return (x - s.x[0]) % 4 === 0 ? ID.floor : 0                  // the legs
    if (y === 2) return ID.solar
    return y === 0 ? ID.deck : -1
  }
  return -1
}

function portalVoxel(x, y, z) {
  if (!PORTAL) return -1
  const { u, v } = local(PORTAL, x, z)
  if (v !== 0 || Math.abs(u) > 2 || y < 1 || y > 6) return -1
  if (Math.abs(u) === 2 || y === 1 || y === 6) return ID.hull
  return ID.portal
}

/* The base's block at (x, y, z), or -1 where the base has nothing to say. */
export function townVoxel(x, y, z) {
  if (y < 0 || y > 17) return -1
  if (Math.abs(x - PAD.at[0]) <= PAD.r + 1 && Math.abs(z - PAD.at[1]) <= PAD.r + 1) { const r = rocketVoxel(x, y, z); if (r !== -1) return r }
  if (Math.abs(x) > TOWN_R + 2 || Math.abs(z) > TOWN_R + 2 || y > 10) return -1
  for (const b of BUILDINGS) { const id = buildingVoxel(b, x, y, z); if (id !== -1) return id }
  const p = portalVoxel(x, y, z)
  if (p !== -1) return p
  const sol = solarVoxel(x, y, z)
  if (sol !== -1) return sol
  if (y === 0 && Math.abs(x) <= 1 && Math.abs(z) <= 1) return ID.charger      // the charging pad, where tickets land
  if (y === 0 && Math.abs(x) <= square && Math.abs(z) <= square) return ID.deck
  return -1
}

/* Where to stand to use each place: in a module, in front of its counter,
   facing the shopkeeper (row 46); the portal and the pad, one block out. */
export function doors() {
  return [...BUILDINGS, PORTAL, PAD].filter(Boolean).map(b => ({
    key: b.key, name: b.name, ready: b.ready, keeper: BUILDINGS.includes(b) || b === PAD,
    pos: b.door || (BUILDINGS.includes(b)
      ? [b.at[0] - b.face[0] * 2 + 0.5, 1, b.at[1] - b.face[1] * 2 + 0.5]
      : [b.at[0] + b.face[0] * 1.5 + 0.5, 1, b.at[1] + b.face[1] * 1.5 + 0.5]),
  }))
}

/* The nearest door within `reach` blocks of p, or null. */
export function doorNear(p, reach = 2.5) {
  let best = null, bd = reach
  for (const d of doors()) {
    const dist = Math.hypot(p[0] - d.pos[0], p[2] - d.pos[2])
    if (dist <= bd && Math.abs(p[1] - 1) < 2) { best = d; bd = dist }
  }
  return best
}
