/* Things you carry and sell. A block that breaks may drop one; it goes into
   the backpack, and turns into coins only at the Trade Hub (row 20). Stage 2
   adds finds (junk to mythic) to this same table.

   value: coins at the Trade Hub. drop: the block id that gives it, and the
   chance it does. */
import { ID } from './blocks.js'

export const ITEMS = {
  copper: { name: 'Copper', value: 3, color: '#d9773a', from: ID.copper_ore, chance: 1 },
  titanium: { name: 'Titanium', value: 6, color: '#e2e8f0', from: ID.titanium_ore, chance: 1 },
  gold: { name: 'Moon gold', value: 12, color: '#f5c518', from: ID.gold_ore, chance: 1 },
  helium: { name: 'Helium-3', value: 15, color: '#4ade80', from: ID.helium_ore, chance: 1 },
  stargem: { name: 'Star gem', value: 30, color: '#f472b6', from: ID.stargem_ore, chance: 1 },
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
