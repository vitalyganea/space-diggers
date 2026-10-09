/* Stranded: the battery is flat below ground. The ways out (GAME_SPEC):
     pay    a recharge on the spot, dearer the deeper you are;
     robot  send something from the backpack up to be sold; the coins come
            when the robot is back, after a trip that grows with depth;
     ad     a rewarded ad, where the site has them;
     free   wait for the free rescue drone: slow, a partial charge, always
            there, so nobody is ever stuck and the game needs no ads.
   Pure: the screen is src/ui/stranded.js. Times are in seconds of game. */
export const FREE_WAIT = 90
export const FREE_CHARGE = 0.3          // of capacity
export const SURFACE_DEPTH = 3          // shallower than this you can walk to town

export const rechargeCost = depth => 10 + Math.floor(depth / 2)
export const tripTime = (depth, speed = 1) => (15 + depth * 0.3) / speed

export class Rescue {
  constructor() {
    this.job = null                     // { kind: 'trip' | 'free', until, item?, value? }
    this.t = 0
  }
  get busy() { return !!this.job }
  left() { return this.job ? Math.max(0, this.job.until - this.t) : 0 }

  sendRobot(item, value, depth, speed = 1) {
    if (this.job) return false
    this.job = { kind: 'trip', item, value, until: this.t + tripTime(depth, speed), total: tripTime(depth, speed) }
    return true
  }
  callFree() {
    if (this.job) return false
    this.job = { kind: 'free', until: this.t + FREE_WAIT, total: FREE_WAIT }
    return true
  }

  /* Advance; returns the finished job once, or null. */
  tick(dt) {
    this.t += dt
    if (this.job && this.t >= this.job.until) { const j = this.job; this.job = null; return j }
    return null
  }
}
