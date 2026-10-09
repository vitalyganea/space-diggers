/* The drill's battery. Digging a block drains its hardness (dirt 0.35,
   stone 0.8, deep stone 1.2...), times `drain` (the lava zone will raise
   it). Walking and climbing are free. Flat, the drill stops: row 18 decides
   what happens then. The Workshop raises the capacity (row 20).

   warn() reports each threshold (25%, then 10%) once on the way down, and
   again after a recharge. */
export const START_CAPACITY = 100
export const WARN_AT = [0.25, 0.1]

export class Battery {
  constructor(capacity = START_CAPACITY, charge = null) {
    const c = Math.floor(+capacity)
    this.capacity = c >= 10 && c <= 10000 ? c : START_CAPACITY      // nonsense from a save: the default
    this.charge = Number.isFinite(+charge) && charge !== null ? Math.max(0, Math.min(this.capacity, +charge)) : this.capacity
    this.drain = 1
    this.warned = WARN_AT.filter(t => this.fraction <= t)
  }
  get fraction() { return this.charge / this.capacity }
  get flat() { return this.charge <= 0 }

  /* Pay for one block; false if the battery was already flat. */
  use(hard) {
    if (this.flat) return false
    this.charge = Math.max(0, this.charge - hard * this.drain)
    return true
  }

  /* The next threshold just crossed, or null. */
  warn() {
    for (const t of WARN_AT) if (this.fraction <= t && !this.warned.includes(t)) { this.warned.push(t); return t }
    return null
  }

  recharge(amount = Infinity) {
    this.charge = Math.min(this.capacity, this.charge + amount)
    this.warned = WARN_AT.filter(t => this.fraction <= t)
  }

  /* About how many more blocks of this hardness it can dig. */
  blocksLeft(hard) { return Math.floor(this.charge / (hard * this.drain)) }

  toJSON() { return { capacity: this.capacity, charge: +this.charge.toFixed(2) } }
}
