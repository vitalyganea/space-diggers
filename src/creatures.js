/* Creatures of the Moon (row 44), with no fighting: the game is digging,
   for children, so nothing here is hurt and nothing hurts you.

     space bats   flutter in the caves; one that reaches you pinches a coin
                  and flies off. Look at one (it is in your lamp's light)
                  and it flees.
     rock worm    below 35 m, now and then, bores a winding tunnel past you,
                  leaving the ore in its walls for you; it bumps you aside
                  if it reaches you. A bomb sends it away.
     rock pup     a friendly one in the deep caves. Feed it a crystal shard
                  (E) and it digs a little and brings you something.

   Models are boxes, like everything else; they move by themselves (no
   physics). `rnd` makes them testable. */
import { MeshBuilder, StandardMaterial, Color3, Mesh, Vector3 } from '@babylonjs/core'
import { ID, byId } from './blocks.js'

export const BAT_STEAL = 1, BAT_MAX = 2
export const WORM_BELOW = -35, WORM_EVERY = [120, 240], WORM_LIFE = 12, WORM_SPEED = 2.2
export const PUP_BELOW = -60, PUP_GIFTS = [['gold', 0.6], ['helium', 0.3], ['stargem', 0.1]]

const mats = new Map()
function mat(scene, hex, glow = 0) {
  const k = hex + glow
  if (!mats.has(k)) {
    const m = new StandardMaterial('c' + k, scene)
    m.diffuseColor = Color3.FromHexString(hex); m.emissiveColor = Color3.FromHexString(hex).scale(glow); m.specularColor = new Color3(0.1, 0.1, 0.1)
    mats.set(k, m)
  }
  return mats.get(k)
}
function model(scene, noa, parts) {
  const root = new Mesh('creature', scene)
  for (const [w, h, d, hex, x, y, z, glow, name] of parts) {
    const b = MeshBuilder.CreateBox(name || 'part', { width: w, height: h, depth: d }, scene)
    b.material = mat(scene, hex, glow); b.parent = root; b.position.set(x, y, z); b.isPickable = false
    noa.rendering.addMeshToScene(b)
  }
  noa.rendering.addMeshToScene(root)
  return root
}

/* the gift a fed rock pup brings, from a 0..1 roll */
export function pupGift(r) {
  let acc = 0
  for (const [item, p] of PUP_GIFTS) { acc += p; if (r < acc) return item }
  return PUP_GIFTS[0][0]
}

/* is (dx, dy, dz) from the eye within `cone` radians of the way you look? */
export function inView(dir, d, cone = 0.35) {
  const len = Math.hypot(d[0], d[1], d[2]) || 1
  const dot = (dir[0] * d[0] + dir[1] * d[1] + dir[2] * d[2]) / len
  return dot > Math.cos(cone)
}

export class Creatures {
  /* hooks: { coins() / takeCoin(), bump(dir), say(text, key), giveItem(item), takeShard() } */
  constructor(noa, world, hooks, rnd = Math.random) {
    this.noa = noa; this.world = world; this.h = hooks; this.rnd = rnd
    this.scene = noa.rendering.getScene()
    this.bats = []; this.worm = null; this.pups = []
    this.wormIn = WORM_EVERY[0] + rnd() * (WORM_EVERY[1] - WORM_EVERY[0])
    this.batT = 0
    this.stolen = 0; this.scared = 0; this.bumps = 0; this.fed = 0
  }
  player() { return this.noa.entities.getPosition(this.noa.playerEntity) }
  place(m, q) { const l = this.noa.globalToLocal(q, null, []); m.position.set(l[0], l[1], l[2]) }
  air(x, y, z) { return this.world.get(Math.floor(x), Math.floor(y), Math.floor(z)) === 0 }

  /* ---------------------------------------------------------------- bats */
  spawnBat(at) {
    const m = model(this.scene, this.noa, [
      [0.22, 0.16, 0.2, '#3b2f4a', 0, 0, 0, 0.1, 'body'],
      [0.36, 0.03, 0.18, '#4c3d63', -0.27, 0.02, 0, 0, 'wingL'], [0.36, 0.03, 0.18, '#4c3d63', 0.27, 0.02, 0, 0, 'wingR'],
      [0.04, 0.04, 0.02, '#fde047', -0.05, 0.03, 0.11, 1.2, 'eye'], [0.04, 0.04, 0.02, '#fde047', 0.05, 0.03, 0.11, 1.2, 'eye'],
    ])
    const b = { m, pos: [...at], t: this.rnd() * 6, flee: 0, took: false }
    this.bats.push(b)
    if (!this.saidBats) { this.saidBats = true; this.h.say('Space bats! They like coins. Look right at them and they fly off.') }
    return b
  }
  /* a cave cell 7–11 blocks away, or null */
  findCave(p) {
    for (let k = 0; k < 30; k++) {
      const a = this.rnd() * Math.PI * 2, d = 7 + this.rnd() * 4
      const q = [p[0] + Math.cos(a) * d, p[1] + 1 + (this.rnd() - 0.5) * 4, p[2] + Math.sin(a) * d]
      if (this.air(...q) && this.air(q[0], q[1] + 1, q[2])) return q
    }
    return null
  }
  updateBats(s, p, eye, look) {
    // in a cave, now and then a bat comes
    this.batT += s
    if (this.batT > 4 && p[1] < -6 && this.bats.length < BAT_MAX) {
      this.batT = 0
      let open = 0
      for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if (this.air(p[0] + i * 2, p[1] + 1, p[2] + j * 2)) open++
      if (open >= 14 && this.rnd() < 0.5) { const q = this.findCave(p); if (q) this.spawnBat(q) }
    }
    for (const b of this.bats) {
      b.t += s
      const to = [eye[0] - b.pos[0], eye[1] - 0.3 - b.pos[1], eye[2] - b.pos[2]], d = Math.hypot(...to)
      if (!b.flee && inView(look, [-to[0], -to[1], -to[2]]) && d < 12) { b.flee = 1; this.scared++; this.h.sound('squeak') }
      let v
      if (b.flee || b.took) v = to.map(c => -c / d * 6)                         // away, fast
      else v = [to[0] / d * 2.4, to[1] / d * 2.4 + Math.sin(b.t * 6) * 1.5, to[2] / d * 2.4]
      for (let i = 0; i < 3; i++) b.pos[i] += v[i] * s
      if (!b.flee && !b.took && d < 1.2) {
        b.took = true
        if (this.h.takeCoin()) { this.stolen++; this.h.sound('squeak'); this.h.say('A bat pinched a coin! Look at them and they fly away.', 'bat') }
      }
      if (b.flee || b.took) b.gone = (b.gone || 0) + s
      this.place(b.m, b.pos)
      b.m.rotation.y = Math.atan2(v[0], v[2])
      for (const w of b.m.getChildMeshes()) if (w.name.startsWith('wing')) w.rotation.z = Math.sin(b.t * 30) * 0.6 * (w.name === 'wingL' ? 1 : -1)
    }
    this.bats = this.bats.filter(b => { if ((b.gone || 0) > 2.5 || Math.hypot(b.pos[0] - p[0], b.pos[2] - p[2]) > 40) { b.m.dispose(false, false); return false } return true })
  }

  /* ---------------------------------------------------------------- worm */
  spawnWorm(p) {
    // from 7 blocks off to one side, past you a block and a half away, and on
    const a = this.rnd() * Math.PI * 2, side = [Math.cos(a), Math.sin(a)]
    const start = [p[0] + side[0] * 7, p[1] + 0.5, p[2] + side[1] * 7]
    const pass = [p[0] - side[1] * 1.6, p[1] + 0.5, p[2] + side[0] * 1.6]
    const dir = [pass[0] - start[0], 0, pass[2] - start[2]], L = Math.hypot(...dir)
    const segs = []
    for (let i = 0; i < 6; i++) segs.push(model(this.scene, this.noa, i === 0 ? [
      [0.9, 0.9, 0.9, '#b45309', 0, 0, 0, 0.05, 'head'], [0.18, 0.18, 0.05, '#fef3c7', -0.2, 0.15, 0.46, 0.8, 'eye'], [0.18, 0.18, 0.05, '#fef3c7', 0.2, 0.15, 0.46, 0.8, 'eye'],
      [0.5, 0.12, 0.05, '#451a03', 0, -0.2, 0.46, 0, 'mouth'],
    ] : [[0.8 - i * 0.06, 0.8 - i * 0.06, 0.8 - i * 0.06, i % 2 ? '#d97706' : '#b45309', 0, 0, 0, 0.05, 'seg']]))
    this.worm = { segs, pos: start, dir: dir.map(c => c / L), t: 0, trail: [], wiggle: this.rnd() * 6, bumped: false }
    this.h.sound('rumble')
    if (!this.saidWorm) { this.saidWorm = true; this.h.say('A rock worm! It digs tunnels and leaves the ore. Mind it does not bump you!') }
    return this.worm
  }
  scareWorm() { if (this.worm) { this.worm.flee = true; this.h.say('The bomb scared the worm away!', 'wormflee') } }
  updateWorm(s, p) {
    if (!this.worm) {
      if (p[1] > WORM_BELOW) return
      this.wormIn -= s
      if (this.wormIn <= 0) { this.wormIn = WORM_EVERY[0] + this.rnd() * (WORM_EVERY[1] - WORM_EVERY[0]); this.spawnWorm(p) }
      return
    }
    const w = this.worm
    w.t += s
    const sp = w.flee ? WORM_SPEED * 3 : WORM_SPEED
    // it wiggles as it goes
    const turn = Math.sin(w.t * 1.7 + w.wiggle) * 0.6 * s
    const c = Math.cos(turn), sn = Math.sin(turn)
    w.dir = [w.dir[0] * c - w.dir[2] * sn, w.flee ? -0.6 : 0, w.dir[0] * sn + w.dir[2] * c]
    for (let i = 0; i < 3; i++) w.pos[i] += w.dir[i] * sp * s
    // it bores: soft rock goes, ore and the base stay
    for (const [dx, dy, dz] of [[0, 0, 0], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
      const x = Math.floor(w.pos[0] + dx * 0.4), y = Math.floor(w.pos[1] + dy * 0.4), z = Math.floor(w.pos[2] + dz * 0.4)
      const b = byId[this.world.get(x, y, z)]
      if (b && b.hard < 50 && b.coins === 0 && ![ID.copper_ore, ID.titanium_ore, ID.gold_ore, ID.stargem_ore, ID.helium_ore, ID.meteor_ore].includes(b.id)) this.world.set(x, y, z, 0)
    }
    w.trail.unshift([...w.pos]); w.trail.length = Math.min(w.trail.length, 60)
    w.segs.forEach((m, i) => { this.place(m, w.trail[Math.min(w.trail.length - 1, i * 5)]); m.rotation.y = Math.atan2(w.dir[0], w.dir[2]) })
    // a bump, never harm
    const d = [p[0] - w.pos[0], p[1] + 0.8 - w.pos[1], p[2] - w.pos[2]]
    if (!w.bumped && Math.hypot(...d) < 1.3) { w.bumped = true; this.bumps++; this.h.bump([d[0] || 0.1, 0, d[2] || 0.1]); this.h.sound('boing') }
    if (w.flee && w.fleeAt === undefined) w.fleeAt = w.t
    if (w.t > WORM_LIFE || (w.flee && w.t - w.fleeAt > 1.5)) {
      for (const m of w.segs) m.dispose(false, false)
      this.worm = null
    }
  }

  /* ---------------------------------------------------------------- pups */
  spawnPup(at) {
    const m = model(this.scene, this.noa, [
      [0.5, 0.4, 0.6, '#9ca3af', 0, 0.2, 0, 0.05, 'body'], [0.38, 0.34, 0.34, '#d1d5db', 0, 0.45, 0.28, 0.05, 'head'],
      [0.08, 0.08, 0.03, '#7df9ff', -0.09, 0.5, 0.46, 1.2, 'eye'], [0.08, 0.08, 0.03, '#7df9ff', 0.09, 0.5, 0.46, 1.2, 'eye'],
      [0.12, 0.2, 0.12, '#a78bfa', 0, 0.48, -0.1, 0.8, 'crystal'], [0.1, 0.16, 0.1, '#a78bfa', 0.14, 0.42, -0.2, 0.8, 'crystal'],
      [0.12, 0.12, 0.3, '#6b7280', 0, 0.25, -0.4, 0, 'tail'],
    ])
    const pup = { m, pos: [...at], t: 0, busy: 0 }
    this.pups.push(pup)
    return pup
  }
  /* E near a pup: feed it if you can; true if a pup was near */
  use(p) {
    const pup = this.pups.find(q => Math.hypot(q.pos[0] - p[0], q.pos[1] - p[1], q.pos[2] - p[2]) < 3)
    if (!pup) return false
    if (pup.busy > 0) { this.h.say('It is busy digging for you!', 'pupbusy'); return true }
    if (!this.h.takeShard()) { this.h.say('The rock pup wants a crystal shard. Dig some crystal, deep down!', 'pupwants'); return true }
    pup.busy = 3; this.fed++; this.h.sound('place')
    this.h.say('Crunch! The rock pup ate the shard and is digging for you...', 'pupate')
    return true
  }
  updatePups(s, p) {
    // one waits in the first deep cave you come to
    if (!this.pups.length && p[1] < PUP_BELOW) {
      this.pupT = (this.pupT || 0) + s
      if (this.pupT > 3) {
        this.pupT = 0
        const q = this.findCave(p)
        if (q) { for (let k = 0; k < 6 && this.air(q[0], q[1] - 1, q[2]); k++) q[1]--; this.spawnPup([Math.floor(q[0]) + 0.5, Math.floor(q[1]), Math.floor(q[2]) + 0.5]); this.h.say('A little rock pup! It loves crystal shards. Go near and press E.', 'pupseen') }
      }
    }
    for (const pup of this.pups) {
      pup.t += s
      if (pup.busy > 0) {
        pup.busy -= s
        pup.m.rotation.y += s * 12                                           // digging round and round
        if (pup.busy <= 0) { const item = pupGift(this.rnd()); this.h.giveItem(item) }
      } else {
        const d = [p[0] - pup.pos[0], p[2] - pup.pos[2]]
        pup.m.rotation.y = Math.atan2(d[0], d[1])                           // it watches you
      }
      this.place(pup.m, [pup.pos[0], pup.pos[1] + Math.abs(Math.sin(pup.t * 3)) * 0.06, pup.pos[2]])
    }
  }

  update(dt) {
    const s = Math.min(0.1, dt / 1000), p = this.player()
    const eye = [p[0], p[1] + 1.5, p[2]]
    const h = this.noa.camera.heading, pt = this.noa.camera.pitch
    const look = [Math.sin(h) * Math.cos(pt), -Math.sin(pt), Math.cos(h) * Math.cos(pt)]
    this.updateBats(s, p, eye, look)
    this.updateWorm(s, p)
    this.updatePups(s, p)
  }
}
