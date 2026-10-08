/* One round: countdown, race, results. Pure logic; the screen reads it.

   phase 'countdown' (COUNTDOWN s): nobody digs, the bots wait.
   phase 'race': the clock runs up to `limit` seconds. A racer finishes by
     standing on the Core; the first to do so wins and the round is over
     (GAME_SPEC: the rest are ranked by depth). If nobody gets there, the
     round ends when the clock runs out.
   phase 'over': `standings()` is final: finishers by time, then everyone
     else by depth. */
import { CORE_Y } from './worldgen.js'

export const COUNTDOWN = 3

export class Round {
  /* racers: [{ name, isPlayer, depth(): blocks below the surface, finished(): bool }] */
  constructor(racers, { limit = 300 } = {}) {
    this.racers = racers.map(r => ({ ...r, finishedAt: null }))
    this.limit = limit
    this.phase = 'countdown'
    this.t = 0                // seconds since the countdown began
    this.onPhase = () => {}
  }

  get raceTime() { return Math.max(0, this.t - COUNTDOWN) }
  get timeLeft() { return Math.max(0, this.limit - this.raceTime) }
  get countdown() { return this.phase === 'countdown' ? Math.ceil(COUNTDOWN - this.t) : 0 }

  tick(dt) {
    if (this.phase === 'over') return
    this.t += dt
    if (this.phase === 'countdown' && this.t >= COUNTDOWN) this.setPhase('race')
    if (this.phase !== 'race') return
    for (const r of this.racers) if (r.finishedAt === null && r.finished()) r.finishedAt = this.raceTime
    if (this.racers.some(r => r.finishedAt !== null) || this.timeLeft <= 0) this.setPhase('over')
  }

  setPhase(p) { this.phase = p; this.onPhase(p) }

  /* Everyone in order: finishers first by time, then by depth. */
  standings() {
    return [...this.racers].sort((a, b) => {
      if (a.finishedAt !== null || b.finishedAt !== null) {
        if (a.finishedAt === null) return 1
        if (b.finishedAt === null) return -1
        return a.finishedAt - b.finishedAt
      }
      return b.depth() - a.depth()
    }).map((r, i) => ({ place: i + 1, name: r.name, isPlayer: !!r.isPlayer, depth: r.depth(),
      finishedAt: r.finishedAt, progress: Math.min(1, r.depth() / (-CORE_Y - 1)) }))
  }

  winner() { const s = this.standings(); return s[0] && s[0].finishedAt !== null ? s[0] : null }
}
