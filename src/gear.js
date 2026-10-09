/* The Workshop's upgrades: kept for good, bought one level at a time.
   Each level's number is what you get; cost is what that level costs.
   Prices rise faster than the backpack's worth, so each level takes a few
   more trips than the last (tests/gear.mjs). */
export const GEAR = {
  drill: { name: 'Drill', unit: '× speed', levels: [1, 1.3, 1.6, 2, 2.5, 3], cost: [0, 50, 150, 400, 1000, 2500] },
  battery: { name: 'Battery', unit: 'charge', levels: [100, 150, 220, 320, 450, 650], cost: [0, 40, 120, 300, 800, 2000] },
  backpack: { name: 'Backpack', unit: 'slots', levels: [20, 30, 45, 65, 90, 120], cost: [0, 40, 120, 300, 800, 2000] },
  lamp: { name: 'Helmet lamp', unit: 'blocks of light', levels: [9, 12, 15, 19, 24], cost: [0, 30, 100, 250, 600] },
  // the laser (row 40): level 0 is not having one yet
  laser: { name: 'Laser', unit: '× speed', levels: [0, 1, 1.3, 1.7, 2.2], cost: [0, 120, 300, 700, 1500] },
}
export const BOMB_PRICE = 25
export const BOMB_CARRY = 5
export const TICKET_PRICE = 15        // a ticket home (row 23): T takes you to town
export const TICKET_CARRY = 5

export function defaultGear() { return { drill: 0, battery: 0, backpack: 0, lamp: 0, laser: 0 } }

/* Levels from a save, each clamped to what exists (0 = the first). */
export function loadGear(o) {
  const g = defaultGear()
  if (o && typeof o === 'object') for (const k of Object.keys(g)) g[k] = Math.max(0, Math.min(GEAR[k].levels.length - 1, Math.floor(+o[k] || 0)))
  return g
}

export function value(gear, key) { return GEAR[key].levels[gear[key]] }
export function nextCost(gear, key) { const c = GEAR[key].cost[gear[key] + 1]; return c === undefined ? null : c }

/* Buy the next level of `key` out of `purse` ({ coins }); true if bought. */
export function buy(gear, key, purse) {
  const c = nextCost(gear, key)
  if (c === null || purse.coins < c) return false
  purse.coins -= c
  gear[key]++
  return true
}
