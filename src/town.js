/* The town at the spawn: a cobbled square with six buildings round it, all
   of blocks that cannot be dug (src/blocks.js, hard 99). The World asks
   townVoxel(x, y, z) first inside TOWN_R (worldgen, with { town: true }).

   A building is described by the middle of its front wall (fx, fz), the
   way its door faces (toward the square), its walls, its awning colour and
   how big it is. Local u runs along the front, v runs from the front wall
   (0) back into the building. */
import { ID } from './blocks.js'

export const TOWN_R = 18          // the town is flat, cobbled and treeless within this
export const SQUARE_R = 16

export const BUILDINGS = [
  { key: 'market', name: 'Market', at: [0, 9], face: [0, -1], wall: ID.floor, awning: ID.light_green, ready: true },
  { key: 'workshop', name: 'Workshop', at: [9, 0], face: [-1, 0], wall: ID.hull, awning: ID.light_yellow, ready: true },
  { key: 'bombs', name: 'Bomb shop', at: [-9, 0], face: [1, 0], wall: ID.hull, awning: ID.light_red, ready: true },
  { key: 'museum', name: 'Museum', at: [0, -9], face: [0, 1], wall: ID.deck, awning: ID.light_blue, ready: false },
  { key: 'robots', name: 'Robot shop', at: [-9, 12], face: [1, 0], wall: ID.floor, awning: ID.light_purple, ready: false },
]
/* The race portal: a frame of bricks round a purple gateway, not a building. */
export const PORTAL = { key: 'portal', name: 'Race portal', at: [9, -12], face: [-1, 0], ready: false }

const W = 3, D = 6, H = 4        // half-width, depth, wall height

function local(b, x, z) {
  const [fx, fz] = b.face, rx = -fz, rz = fx
  const dx = x - b.at[0], dz = z - b.at[1]
  return { u: dx * rx + dz * rz, v: -(dx * fx + dz * fz) }
}

function buildingVoxel(b, x, y, z) {
  const { u, v } = local(b, x, z)
  if (v === -1 && Math.abs(u) <= 1 && y === 3) return b.awning               // over the door
  if (Math.abs(u) > W || v < 0 || v > D) return -1
  if (y === 0) return ID.deck
  if (y === H + 1) return ID.solar
  if (y === H + 2) return Math.abs(u) <= 1 ? ID.solar : 0                       // a ridge along the top
  if (y > H + 2) return 0
  const front = v === 0, back = v === D, side = Math.abs(u) === W
  if (!(front || back || side)) return 0                                      // inside
  if (front && u === 0 && y <= 2) return 0                                    // the door
  if (y === 2 && ((front && Math.abs(u) === 2) || (side && (v === 2 || v === 4)))) return ID.glass
  return b.wall
}

function portalVoxel(x, y, z) {
  const { u, v } = local(PORTAL, x, z)
  if (v !== 0 || Math.abs(u) > 2 || y < 1 || y > 6) return -1
  if (Math.abs(u) === 2 || y === 1 || y === 6) return ID.hull
  return ID.portal
}

/* The town's block at (x, y, z), or -1 where the town has nothing to say. */
export function townVoxel(x, y, z) {
  if (Math.abs(x) > TOWN_R + 2 || Math.abs(z) > TOWN_R + 2 || y < 0 || y > 10) return -1
  for (const b of BUILDINGS) { const id = buildingVoxel(b, x, y, z); if (id !== -1) return id }
  const p = portalVoxel(x, y, z)
  if (p !== -1) return p
  if (y === 0 && Math.abs(x) <= SQUARE_R && Math.abs(z) <= SQUARE_R) return ID.deck
  return -1
}

/* Where to stand to use each place: one block out from its door. */
export function doors() {
  return [...BUILDINGS, PORTAL].map(b => ({
    key: b.key, name: b.name, ready: b.ready,
    pos: [b.at[0] + b.face[0] * 1.5 + 0.5, 1, b.at[1] + b.face[1] * 1.5 + 0.5],
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
