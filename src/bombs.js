/* Bombs on screen: thrown, bouncing, fizzing, then BOOM.

   throw(from, dir) launches a bomb as a small noa physics entity; after
   FUSE seconds it blows up: the rules in src/blast.js carve the World, and
   here there is a flash, a spray of rock and a shake of the camera. Bots'
   bombs (src/bots.js) go off at once and only get the show. */
import { MeshBuilder, StandardMaterial, Color3, Mesh } from '@babylonjs/core'
import { blast, knocked, FUSE } from './blast.js'

export class Bombs {
  /* onBlast({ center, broken, coins, thrower }) after every explosion */
  constructor(noa, world, { onBlast = () => {} } = {}) {
    this.noa = noa
    this.world = world
    this.onBlast = onBlast
    this.scene = noa.rendering.getScene()
    this.live = []
    this.fx = []
    this.shake = 0
    const m = (hex, glow) => {
      const x = new StandardMaterial('bomb' + hex, this.scene)
      x.diffuseColor = Color3.FromHexString(hex)
      x.emissiveColor = Color3.FromHexString(hex).scale(glow)
      return x
    }
    this.mats = { shell: m('#1f2328', 0.1), band: m('#e63946', 0.3), spark: m('#ffd166', 1), flash: m('#ffb347', 1), rock: m('#6b6259', 0.2) }
    this.mats.flash.alpha = 0.7
    noa.on('tick', dt => this.tick(dt / 1000))
    noa.on('beforeRender', dt => this.animate(dt / 1000))
  }

  /* A bomb from `from` (global position) along `dir`, by `thrower`. */
  throw(from, dir, thrower = 'you') {
    const root = new Mesh('bomb', this.scene)
    const ball = MeshBuilder.CreateSphere('bombBall', { diameter: 0.42, segments: 8 }, this.scene)
    ball.material = this.mats.shell
    ball.parent = root
    const band = MeshBuilder.CreateTorus('bombBand', { diameter: 0.42, thickness: 0.06, tessellation: 12 }, this.scene)
    band.material = this.mats.band
    band.parent = root
    const spark = MeshBuilder.CreateBox('bombSpark', { size: 0.09 }, this.scene)
    spark.material = this.mats.spark
    spark.parent = root
    spark.position.y = 0.26
    for (const x of [ball, band, spark]) { x.isPickable = false; this.noa.rendering.addMeshToScene(x) }
    const id = this.noa.entities.add([...from], 0.36, 0.36, root, [0, 0.18, 0], true, false)
    const body = this.noa.entities.getPhysics(id).body
    body.velocity = [dir[0] * 11, dir[1] * 11 + 3, dir[2] * 11]
    body.restitution = 0.35
    body.friction = 4
    this.live.push({ id, root, spark, t: FUSE, thrower })
    return id
  }

  tick(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const b = this.live[i]
      b.t -= dt
      if (b.t > 0) continue
      const p = this.noa.entities.getPosition(b.id)
      const c = [p[0], p[1] + 0.2, p[2]]
      this.noa.entities.deleteEntity(b.id)
      b.root.getChildMeshes().forEach(m => m.dispose()); b.root.dispose()
      this.live.splice(i, 1)
      this.explode(c, b.thrower)
    }
  }

  /* Carve, pay, and put on the show. Returns blast()'s result. */
  explode(c, thrower) {
    const res = blast(this.world, c)
    this.show(c, res.broken)
    this.onBlast({ center: c, ...res, thrower })
    return res
  }

  /* The show only: a flash that swells and fades, chunks of rock thrown
     out (one per broken block, at most 30), the camera shaken if near. */
  show(c, broken = []) {
    const flash = MeshBuilder.CreateSphere('flash', { diameter: 1, segments: 8 }, this.scene)
    flash.material = this.mats.flash
    flash.isPickable = false
    this.noa.rendering.addMeshToScene(flash, false, c)
    this.fx.push({ mesh: flash, g: c, v: [0, 0, 0], age: 0, life: 0.35, kind: 'flash' })
    for (const b of broken.slice(0, 30)) {
      const rock = MeshBuilder.CreateBox('rock', { size: 0.22 }, this.scene)
      rock.material = this.mats.rock
      rock.isPickable = false
      const g = [b.pos[0] + 0.5, b.pos[1] + 0.5, b.pos[2] + 0.5]
      this.noa.rendering.addMeshToScene(rock, false, g)
      const d = [g[0] - c[0], g[1] - c[1], g[2] - c[2]]
      this.fx.push({ mesh: rock, g, v: [d[0] * 4, d[1] * 4 + 4, d[2] * 4], age: 0, life: 0.9, kind: 'rock' })
    }
    const p = this.noa.entities.getPosition(this.noa.playerEntity)
    const dist = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])
    this.shake = Math.max(this.shake, Math.max(0, 0.5 - dist / 30))
  }

  animate(dt) {
    for (const b of this.live) b.spark.setEnabled(Math.floor(b.t * 10) % 2 === 0)   // the fuse fizzes
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i]
      f.age += dt
      const k = f.age / f.life
      if (f.kind === 'flash') { f.mesh.scaling.setAll(1 + k * 5); f.mesh.visibility = 1 - k }
      else {
        f.v[1] -= 18 * dt
        for (let j = 0; j < 3; j++) f.g[j] += f.v[j] * dt
        const l = this.noa.globalToLocal(f.g, null, [])
        f.mesh.position.set(l[0], l[1], l[2])
        f.mesh.scaling.setAll(1 - k)
      }
      if (k >= 1) { f.mesh.dispose(); this.fx.splice(i, 1) }
    }
    // the shake: the camera jitters and settles
    const cam = this.noa.rendering.camera
    if (this.shake > 0.005) {
      cam.position.x = (Math.random() - 0.5) * this.shake
      cam.position.y = (Math.random() - 0.5) * this.shake
      this.shake *= Math.pow(0.02, dt)
    } else { cam.position.x = 0; cam.position.y = 0; this.shake = 0 }
  }

  /* racers near c, for whoever handles knocking */
  reach(c, racers) { return knocked(c, racers) }
}
