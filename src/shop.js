/* What coins buy during a round. A holder is anything with { coins,
   speed, drillLevel, bombs }: the player's digger or a bot.

   Drill: four levels, each faster; Bomb: one at a time, at most MAX_BOMBS
   carried. Prices are set against what a lane pays: about 40–100 coins of
   ore on the way down, so a player who mines can reach the top drill
   around half way, and one who only digs straight never will. */
export const DRILL = [
  { level: 1, speed: 1.0, cost: 0 },
  { level: 2, speed: 1.3, cost: 15 },
  { level: 3, speed: 1.6, cost: 40 },
  { level: 4, speed: 2.0, cost: 80 },
]
export const BOMB_COST = 20
export const MAX_BOMBS = 3

export function nextDrill(h) { return DRILL[h.drillLevel] || null }   // drillLevel is 1-based

export function buyDrill(h) {
  const next = nextDrill(h)
  if (!next || h.coins < next.cost) return false
  h.coins -= next.cost
  h.drillLevel = next.level
  h.speed = next.speed
  return true
}

export function buyBomb(h) {
  if (h.bombs >= MAX_BOMBS || h.coins < BOMB_COST) return false
  h.coins -= BOMB_COST
  h.bombs++
  return true
}
