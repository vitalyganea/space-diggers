/* Things you carry and sell. A block that breaks may drop one; it goes into
   the backpack, and turns into coins only at the Market (row 20). Stage 2
   adds finds (junk to mythic) to this same table.

   value: coins at the Market. drop: the block id that gives it, and the
   chance it does. */
import { ID } from './blocks.js'

export const ITEMS = {
  coal: { name: 'Coal', value: 2, color: '#2b2b2e', from: ID.coal_ore, chance: 1 },
  iron: { name: 'Iron', value: 5, color: '#d8a77a', from: ID.iron_ore, chance: 1 },
  gold: { name: 'Gold', value: 12, color: '#f5c518', from: ID.gold_ore, chance: 1 },
  gem: { name: 'Gem', value: 25, color: '#2dd4bf', from: ID.gem_ore, chance: 1 },
  shard: { name: 'Crystal shard', value: 6, color: '#a78bfa', from: ID.crystal, chance: 0.3 },
}

/* What a broken block drops, if anything. `rnd` is 0..1. */
export function dropFor(blockId, rnd = Math.random()) {
  for (const [key, it] of Object.entries(ITEMS)) if (it.from === blockId && rnd < it.chance) return key
  return null
}

export const START_CAPACITY = 20

/* The backpack: counts by item, room for `capacity` things in all. */
export class Backpack {
  constructor(capacity = START_CAPACITY, items = {}) {
    this.capacity = Math.max(1, Math.min(1000, Math.floor(+capacity) || START_CAPACITY))
    this.items = {}
    for (const [k, n] of Object.entries(items)) if (ITEMS[k] && n > 0) this.items[k] = Math.floor(n)
  }
  get count() { return Object.values(this.items).reduce((a, b) => a + b, 0) }
  get full() { return this.count >= this.capacity }
  get value() { return Object.entries(this.items).reduce((a, [k, n]) => a + ITEMS[k].value * n, 0) }
  add(key, n = 1) {
    if (!ITEMS[key] || this.count + n > this.capacity) return false
    this.items[key] = (this.items[key] || 0) + n
    return true
  }
  take(key, n = 1) {
    if ((this.items[key] || 0) < n) return false
    this.items[key] -= n
    if (!this.items[key]) delete this.items[key]
    return true
  }
  sellValue(mult = 1) { return Math.round(this.value * mult) }

  /* Empty it into coins at `mult` (a perk); returns the coins. */
  sellAll(mult = 1) {
    const coins = Math.round(this.value * mult)
    this.items = {}
    return coins
  }
  toJSON() { return { capacity: this.capacity, items: this.items } }
}
