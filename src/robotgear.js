/* The Robot Bay's upgrades (row 51): Sprocket makes your robot better.
   Kept on the save as `robotGear` { speed, light, talent }, levels from 0.
     speed   its trips to the Trade Hub are quicker
     light   its lamp lights further
     talent  more of what it is best at: Bzz's trips quicker still, Bolt
             carries 5 more, Sonar feels treasure 2 blocks further
   Swapping to another robot (keeping its name) costs SWAP_PRICE. */
export const ROBOT_GEAR = {
  speed: { name: 'Robot speed', levels: [1, 1.4, 1.8, 2.3, 3], cost: [0, 60, 150, 350, 800], unit: '× quicker trips' },
  light: { name: 'Robot light', levels: [6, 8, 10, 12, 15], cost: [0, 40, 100, 250, 600], unit: 'blocks of light' },
  talent: { name: 'Its talent', levels: [0, 1, 2, 3], cost: [0, 80, 200, 500], unit: 'level' },
}
export const SWAP_PRICE = 50

export function defaultRobotGear() { return { speed: 0, light: 0, talent: 0 } }
export function loadRobotGear(o) {
  const g = defaultRobotGear()
  if (o && typeof o === 'object') for (const k of Object.keys(g)) g[k] = Math.max(0, Math.min(ROBOT_GEAR[k].levels.length - 1, Math.floor(+o[k] || 0)))
  return g
}
export const rgValue = (g, k) => ROBOT_GEAR[k].levels[g[k]]
export const rgNext = (g, k) => { const c = ROBOT_GEAR[k].cost[g[k] + 1]; return c === undefined ? null : c }
export function rgBuy(g, k, purse) {
  const c = rgNext(g, k)
  if (c === null || purse.coins < c) return false
  purse.coins -= c; g[k]++; return true
}

/* What a robot of `kind` with gear `g` does, as numbers the game uses. */
export function robotStats(kind, g, R) {
  const t = g.talent
  return {
    tripSpeed: R.tripSpeed * rgValue(g, 'speed') * (kind === 'bzz' ? 1 + 0.25 * t : 1),
    bagBonus: R.bagBonus + (kind === 'bolt' ? 5 * t : 0),
    sonarRange: R.sonar ? 6 + 2 * t : 0,
    light: rgValue(g, 'light'),
  }
}
export const TALENT_WORDS = { bzz: 'trips even quicker', bolt: '+5 backpack slots', sonar: 'feels treasure 2 blocks further' }
