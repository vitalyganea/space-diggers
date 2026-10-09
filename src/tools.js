/* The two tools (row 40): the drill, and the laser bought at the Workshop.
   The laser is slow in soft rock but cuts meteorite and crystal three
   times as fast as it would anything else. For children the right one
   picks itself: when what you aim at changes kind (soft rock, or laser
   rock), the tool that suits it comes to hand. 1, 2 or the wheel choose
   one by hand, until you aim at the other kind. */
import { ID } from './blocks.js'
import { value } from './gear.js'

export const LASER_ROCK = new Set([ID.meteorite, ID.meteor_ore, ID.crystal])
export const LASER_FAST = 3, LASER_SLOW = 0.5

export const hasLaser = gear => (gear.laser || 0) > 0

/* how fast `tool` digs block `id`, as a multiplier on the block's time */
export function toolSpeed(tool, id, gear) {
  if (tool === 'laser' && hasLaser(gear)) return value(gear, 'laser') * (LASER_ROCK.has(id) ? LASER_FAST : LASER_SLOW)
  return value(gear, 'drill')
}

/* the tool that suits block `id` */
export function suits(id, gear) { return hasLaser(gear) && LASER_ROCK.has(id) ? 'laser' : 'drill' }

/* Which tool is in hand: picks itself when the kind of target changes. */
export class Hand {
  constructor() { this.tool = 'drill'; this.kind = null }
  aim(id, gear) {
    if (id == null) return this.tool
    const kind = LASER_ROCK.has(id) ? 'hard' : 'soft'
    if (kind !== this.kind) { this.kind = kind; this.tool = suits(id, gear) }
    return this.tool
  }
  choose(tool, gear) { if (tool === 'drill' || (tool === 'laser' && hasLaser(gear))) this.tool = tool; return this.tool }
  next(gear) { return this.choose(this.tool === 'drill' ? 'laser' : 'drill', gear) }
}
