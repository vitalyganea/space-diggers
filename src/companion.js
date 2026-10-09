/* Your robot friend in the world. A flying one keeps by your right
   shoulder, a little behind, out of your way; it comes round in front of
   you only while it is speaking (the user found it irritating always in
   view). Bolt rolls along the ground behind you on its tracks. Both light
   the tunnel with a small lamp, and go off to the Trade Hub (and back) when
   sent. Sonar scouts for gold and gems nearby. */
import { PointLight, Vector3, Color3 } from '@babylonjs/core'
import { makeRobot, ROBOTS } from './robots.js'
import { ID } from './blocks.js'

const SHINY = new Set([ID.gold_ore, ID.helium_ore, ID.stargem_ore])

export class Companion {
  constructor(noa, kind) {
    this.noa = noa
    this.kind = kind
    this.R = ROBOTS[kind]
    const scene = noa.rendering.getScene()
    this.model = makeRobot(scene, kind, m => noa.rendering.addMeshToScene(m))
    this.model.root.scaling.setAll(this.R.ground ? 1 : 0.75)        // the rover on the ground, a little bigger
    noa.rendering.addMeshToScene(this.model.root, false, [0, 0, 0])
    this.pos = [...noa.entities.getPosition(noa.playerEntity)]
    this.pos[1] += 1.6
    this.away = false           // off on a trip to the Trade Hub
    this.light = new PointLight('robotLight', new Vector3(0, 0, 0), scene)
    this.light.diffuse = new Color3(0.5, 0.95, 1)
    this.light.specular = new Color3(0, 0, 0)
    this.light.range = 6
    this.light.intensity = 0.55
  }

  home() {
    const p = this.noa.entities.getPosition(this.noa.playerEntity)
    const w = this.world
    const air = w ? (x, y, z) => w.get(Math.floor(x), Math.floor(y), Math.floor(z)) === 0 : () => true
    return followSpot(p, this.noa.camera.heading, !!this.R.ground, !!this.speaking, air)
  }

  update(dt) {
    const s = dt / 1000
    const target = this.away ? [this.pos[0], this.pos[1] + 40, this.pos[2]] : this.home()
    const k = Math.min(1, s * (this.away ? 1.2 : 6))
    let moved = 0
    for (let i = 0; i < 3; i++) { const d = (target[i] - this.pos[i]) * k; this.pos[i] += d; moved += Math.abs(d) }
    const local = this.noa.globalToLocal(this.pos, null, [])
    this.model.root.position.set(local[0], local[1], local[2])
    // a flyer faces you; Bolt faces the way it rolls, and turns to you when it stops
    if (this.R.ground && moved > 0.02) this.model.root.rotation.y = Math.atan2(target[0] - this.pos[0], target[2] - this.pos[2]) || this.model.root.rotation.y
    else this.model.root.rotation.y = this.noa.camera.heading + Math.PI
    this.model.root.setEnabled(!(this.away && this.pos[1] > this.noa.entities.getPosition(this.noa.playerEntity)[1] + 30))
    this.light.position.set(local[0], local[1], local[2])
    this.light.intensity = this.away ? 0 : 0.55
    this.model.update(dt, moved > 0.02)
  }

  leave() { this.away = true }
  /* back from the trip: it drops in from above */
  back() {
    this.away = false
    const p = this.noa.entities.getPosition(this.noa.playerEntity)
    this.pos = [p[0], p[1] + 8, p[2]]
  }

  /* Sonar: the nearest gold, helium or star gem within `r` blocks, as { dir, dist } in
     words relative to where you look, or null. */
  scan(world, r = 6) {
    if (!this.R.sonar) return null
    const p = this.noa.entities.getPosition(this.noa.playerEntity)
    const c = [Math.floor(p[0]), Math.floor(p[1] + 0.8), Math.floor(p[2])]
    let best = null
    for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) {
      if (!SHINY.has(world.get(c[0] + x, c[1] + y, c[2] + z))) continue
      const d = Math.hypot(x, y, z)
      if (!best || d < best.d) best = { d, x, y, z, id: world.get(c[0] + x, c[1] + y, c[2] + z) }
    }
    if (!best) return null
    return { dist: Math.round(best.d), dir: direction(best, this.noa.camera.heading), id: best.id, at: [c[0] + best.x, c[1] + best.y, c[2] + best.z] }
  }
}

/* Where the robot wants to be, for a player at p (feet) looking along
   heading h (0 is +z; +x is then to the right). air(x, y, z) says whether a
   point is open.
     flyer:  by the right shoulder and a little behind, above eye level, so
             it is out of view; while speaking, ahead and to the right, in
             view. In rock (a shaft one block wide) it goes over your head,
             where the dug shaft is open.
     ground: on the floor behind you and to the right, or straight behind,
             or (in a shaft) climbing the wall over your head. */
export function followSpot(p, h, ground, speaking, air) {
  const fwd = [Math.sin(h), Math.cos(h)], right = [Math.cos(h), -Math.sin(h)]
  const at = (r, f, up) => [p[0] + right[0] * r + fwd[0] * f, p[1] + up, p[2] + right[1] * r + fwd[1] * f]
  const open = q => air(q[0], q[1], q[2])
  const tries = ground
    ? (speaking ? [at(-0.5, 2.8, 0.05), at(-0.4, 1.8, 0.05), at(0.9, -1.2, 0.05)] : [at(0.9, -1.2, 0.05), at(0, -1.3, 0.05)])
        .filter(q => open(q) && open([q[0], q[1] + 0.9, q[2]]) && !air(q[0], q[1] - 0.5, q[2]))
    : (speaking ? [at(0.7, 2.2, 1.75)] : [at(0.85, -0.5, 1.95)]).filter(open)
  if (tries.length) return tries[0]
  return [p[0] - fwd[0] * 0.2, p[1] + 2.9, p[2] - fwd[1] * 0.2]
}

/* "to your left", "ahead", "below you"... from an offset and your heading */
export function direction(o, heading) {
  if (Math.abs(o.y) > Math.hypot(o.x, o.z)) return o.y < 0 ? 'below you' : 'above you'
  const fwd = o.x * Math.sin(heading) + o.z * Math.cos(heading)       // heading 0 looks down +z
  const right = o.x * Math.cos(heading) - o.z * Math.sin(heading)
  if (Math.abs(fwd) >= Math.abs(right)) return fwd >= 0 ? 'ahead' : 'behind you'
  return right >= 0 ? 'to your right' : 'to your left'
}
