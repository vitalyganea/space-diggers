/* Your robot friend in the world: it floats beside your shoulder, faces
   where you face, lights the tunnel with a small lamp of its own, and
   flies off up out of sight when it goes to the Market (and back when the
   trip is done). Sonar scouts for gold and gems nearby. */
import { PointLight, Vector3, Color3 } from '@babylonjs/core'
import { makeRobot, ROBOTS } from './robots.js'
import { ID } from './blocks.js'

const SHINY = new Set([ID.gold_ore, ID.gem_ore])

export class Companion {
  constructor(noa, kind) {
    this.noa = noa
    this.kind = kind
    this.R = ROBOTS[kind]
    const scene = noa.rendering.getScene()
    this.model = makeRobot(scene, kind, m => noa.rendering.addMeshToScene(m))
    this.model.root.scaling.setAll(0.75)
    noa.rendering.addMeshToScene(this.model.root, false, [0, 0, 0])
    this.pos = [...noa.entities.getPosition(noa.playerEntity)]
    this.pos[1] += 1.6
    this.away = false           // off on a trip to the Market
    this.light = new PointLight('robotLight', new Vector3(0, 0, 0), scene)
    this.light.diffuse = new Color3(0.5, 0.95, 1)
    this.light.specular = new Color3(0, 0, 0)
    this.light.range = 6
    this.light.intensity = 0.55
  }

  /* where it wants to be: ahead and to the right, above your eyes, so it
     shows in the top corner of the view. Where that is inside rock (a
     shaft one block wide) it floats over your head instead, where the dug
     shaft is open. Needs a World to check (set by the game). */
  home() {
    const p = this.noa.entities.getPosition(this.noa.playerEntity)
    const h = this.noa.camera.heading
    const side = [p[0] + Math.cos(h) * 0.7 + Math.sin(h) * 2.2, p[1] + 1.75, p[2] - Math.sin(h) * 0.7 + Math.cos(h) * 2.2]
    if (!this.world || this.world.get(Math.floor(side[0]), Math.floor(side[1]), Math.floor(side[2])) === 0) return side
    return [p[0] + Math.sin(h) * 0.2, p[1] + 2.9, p[2] + Math.cos(h) * 0.2]
  }

  update(dt) {
    const s = dt / 1000
    const target = this.away ? [this.pos[0], this.pos[1] + 40, this.pos[2]] : this.home()
    const k = Math.min(1, s * (this.away ? 1.2 : 6))
    let moved = 0
    for (let i = 0; i < 3; i++) { const d = (target[i] - this.pos[i]) * k; this.pos[i] += d; moved += Math.abs(d) }
    const local = this.noa.globalToLocal(this.pos, null, [])
    this.model.root.position.set(local[0], local[1], local[2])
    this.model.root.rotation.y = this.noa.camera.heading + Math.PI      // facing you, eyes and all
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

  /* Sonar: the nearest gold or gem within `r` blocks, as { dir, dist } in
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

/* "to your left", "ahead", "below you"... from an offset and your heading */
export function direction(o, heading) {
  if (Math.abs(o.y) > Math.hypot(o.x, o.z)) return o.y < 0 ? 'below you' : 'above you'
  const fwd = o.x * Math.sin(heading) + o.z * Math.cos(heading)       // heading 0 looks down +z
  const right = o.x * Math.cos(heading) - o.z * Math.sin(heading)
  if (Math.abs(fwd) >= Math.abs(right)) return fwd >= 0 ? 'ahead' : 'behind you'
  return right >= 0 ? 'to your right' : 'to your left'
}
