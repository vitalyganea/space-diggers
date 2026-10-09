/* Meteors from the rings (row 38). Now and then a chunk of the ringed
   planet's rings falls on the Moon: a fireball streaks down out of the sky
   from the planet's side, strikes 30–60 blocks from you, and leaves a
   small fresh crater of meteorite rock, rich in meteor iron. A marker on
   the minimap shows where until you get there; the robot calls you over.

   The first falls after FIRST seconds of play, then one every EVERY_MIN to
   EVERY_MAX. Nothing falls on the base's plain, and nothing hurts you. */
import { MeshBuilder, StandardMaterial, Color3, PointLight, Vector3, Mesh, DynamicTexture, Engine, Matrix } from '@babylonjs/core'
import { ID } from './blocks.js'
import { MOON } from './worldgen.js'

export const FIRST = 180, EVERY_MIN = 360, EVERY_MAX = 600
export const FALL = 2.6                       // seconds from the sky to the ground
const CRATER_R = 3

/* Where the next one strikes: 30–60 blocks from (px, pz), off the plain. */
export function impactSite(px, pz, rnd) {
  for (let k = 0; k < 40; k++) {
    const a = rnd() * Math.PI * 2, d = 30 + rnd() * 30
    const x = Math.floor(px + Math.cos(a) * d), z = Math.floor(pz + Math.sin(a) * d)
    if (Math.hypot(x, z) > MOON.plain + 6) return [x, z]
  }
  return [Math.floor(px) + 60, Math.floor(pz)]
}

/* The blocks a strike at (x, z) changes, given top(x, z), the height of
   the ground there: a bowl dug out, and under its floor a lens of
   meteorite, a quarter of it meteor iron and some star gems. */
export function craterEdits(x, z, top, rnd) {
  const out = []
  for (let dx = -CRATER_R; dx <= CRATER_R; dx++) for (let dz = -CRATER_R; dz <= CRATER_R; dz++) {
    const d = Math.hypot(dx, dz) / CRATER_R
    if (d > 1) continue
    const t = top(x + dx, z + dz), deep = Math.round(2.2 * (1 - d * d))
    for (let k = 0; k < deep; k++) out.push([x + dx, t - k, z + dz, 0])
    const floor = t - deep
    const lens = Math.round(3 * (1 - d * d)) + 1
    for (let k = 0; k < lens; k++) {
      const r = rnd()
      out.push([x + dx, floor - k, z + dz, r < 0.25 ? ID.meteor_ore : r < 0.31 ? ID.stargem_ore : ID.meteorite])
    }
  }
  return out
}

export class Meteors {
  /* onImpact({ at: [x, y, z], dir }) after a strike */
  constructor(noa, world, { onImpact = () => {}, onFall = () => {}, rnd = Math.random, skyDir = () => new Vector3(-0.5, 0.6, -0.6) } = {}) {
    this.noa = noa; this.world = world; this.onImpact = onImpact; this.onFall = onFall; this.rnd = rnd; this.skyDir = skyDir
    this.next = FIRST
    this.fall = null
    this.marks = []                          // [x, y, z] of fresh craters not yet visited
    this.count = 0
    const scene = noa.rendering.getScene()
    const mat = new StandardMaterial('fireball', scene)
    mat.disableLighting = true; mat.emissiveColor = new Color3(1, 0.6, 0.2); mat.fogEnabled = false
    this.ball = MeshBuilder.CreateSphere('fireball', { diameter: 2, segments: 10 }, scene)
    this.ball.material = mat; this.ball.isPickable = false
    noa.rendering.addMeshToScene(this.ball)
    // a soft halo round it, always facing you
    const ht = new DynamicTexture('fireHalo', { width: 128, height: 128 }, scene, false)
    const g = ht.getContext(), rg = g.createRadialGradient(64, 64, 4, 64, 64, 64)
    rg.addColorStop(0, 'rgba(255,230,160,1)'); rg.addColorStop(0.35, 'rgba(255,140,40,0.7)'); rg.addColorStop(1, 'rgba(255,80,0,0)')
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128); ht.update(); ht.hasAlpha = true
    const hm = new StandardMaterial('fireHaloMat', scene)
    hm.disableLighting = true; hm.emissiveTexture = ht; hm.opacityTexture = ht; hm.alphaMode = Engine.ALPHA_ADD; hm.fogEnabled = false; hm.backFaceCulling = false
    this.halo = MeshBuilder.CreatePlane('fireHalo', { size: 9 }, scene)
    this.halo.material = hm; this.halo.billboardMode = Mesh.BILLBOARDMODE_ALL; this.halo.isPickable = false
    noa.rendering.addMeshToScene(this.halo)
    // the tail: a cone from the ball back along its path
    const tm = new StandardMaterial('fireTail', scene)
    tm.disableLighting = true; tm.emissiveColor = new Color3(1, 0.55, 0.15); tm.alpha = 0.55; tm.fogEnabled = false
    this.tail = MeshBuilder.CreateCylinder('fireTail', { diameterTop: 0, diameterBottom: 1.9, height: 1, tessellation: 10 }, scene)
    this.tail.material = tm; this.tail.isPickable = false
    this.tail.bakeTransformIntoVertices(Matrix.RotationX(Math.PI / 2))      // its point along +z, so lookAt aims it
    noa.rendering.addMeshToScene(this.tail)
    this.trail = [this.halo, this.tail]
    this.light = new PointLight('fireballLight', new Vector3(0, 0, 0), scene)
    this.light.diffuse = new Color3(1, 0.6, 0.25); this.light.range = 30; this.light.intensity = 0
    this.show(false)
  }

  show(on) { this.ball.setEnabled(on); for (const m of this.trail) m.setEnabled(on); if (!on) this.light.intensity = 0 }

  /* the ground's top at (x, z), from the World */
  top(x, z) { for (let y = 14; y > -20; y--) if (this.world.get(x, y, z) !== 0) return y; return 0 }

  /* Start one now; at [x, z] if given. */
  drop(at) {
    if (this.fall) return false
    const p = this.noa.entities.getPosition(this.noa.playerEntity)
    const [x, z] = at || impactSite(p[0], p[2], this.rnd)
    const y = this.top(x, z)
    const d = this.skyDir()
    const from = [x + 0.5 + d.x * 70, y + 110, z + 0.5 + d.z * 70]     // steeply, from the planet's side: in view when you look at where it lands
    this.fall = { from, to: [x + 0.5, y + 0.5, z + 0.5], x, z, t: 0, pos: [...from], hist: [] }
    this.count++
    this.onFall({ at: [x, y, z] })
    return true
  }

  update(dt) {
    const s = dt / 1000
    if (!this.fall) {
      this.next -= s
      const p = this.noa.entities.getPosition(this.noa.playerEntity)
      if (this.next <= 0 && p[1] > -4) { this.drop(); this.next = EVERY_MIN + this.rnd() * (EVERY_MAX - EVERY_MIN) }
      // a mark goes once you have been there
      this.marks = this.marks.filter(m => Math.hypot(p[0] - m[0], p[2] - m[2]) > 4)
      return
    }
    const f = this.fall
    f.t += s
    const k = Math.min(1, f.t / FALL), e = k * k                // speeding up as it falls
    for (let i = 0; i < 3; i++) f.pos[i] = f.from[i] + (f.to[i] - f.from[i]) * e
    f.hist.unshift([...f.pos]); f.hist.length = Math.min(f.hist.length, 30)
    this.show(true)
    const place = (m, q) => { const l = this.noa.globalToLocal(q, null, []); m.position.set(l[0], l[1], l[2]) }
    place(this.ball, f.pos)
    place(this.halo, f.pos)
    // the tail reaches back to where the ball was a quarter of a second ago
    const back = f.hist[Math.min(f.hist.length - 1, 8)] || f.pos
    const len = Math.max(0.5, Math.hypot(back[0] - f.pos[0], back[1] - f.pos[1], back[2] - f.pos[2]))
    place(this.tail, [(back[0] + f.pos[0]) / 2, (back[1] + f.pos[1]) / 2, (back[2] + f.pos[2]) / 2])
    const bl = this.noa.globalToLocal(back, null, [])
    this.tail.scaling.set(1, 1, len)
    this.tail.lookAt(new Vector3(bl[0], bl[1], bl[2]))
    const l = this.noa.globalToLocal(f.pos, null, [])
    this.light.position.set(l[0], l[1], l[2]); this.light.intensity = 2.5
    if (k >= 1) {
      this.fall = null
      this.show(false)
      for (const [x, y, z, id] of craterEdits(f.x, f.z, (a, b) => this.top(a, b), this.rnd)) this.world.set(x, y, z, id)
      const at = [f.x, this.top(f.x, f.z), f.z]
      this.marks.push(at)
      this.onImpact({ at })
    }
  }
}
