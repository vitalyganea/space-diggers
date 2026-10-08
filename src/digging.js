/* Digging: hold the left button on a block and it cracks, then breaks.

   A block takes its `hard` seconds (src/blocks.js) divided by `speed`, the
   drill multiplier the upgrades raise. Moving the aim to another block
   starts over. While it is dug a cracked shell sits over it (five stages);
   when it breaks it bursts into small cubes of its own texture, and its
   coins are paid. Lava and the Core cannot be dug. */
import { MeshBuilder, StandardMaterial, Texture, Color3 } from '@babylonjs/core'
import { byId } from './blocks.js'

const STAGES = 5
const UNBREAKABLE = 50          // a `hard` this high cannot be dug

export class Digger {
  constructor(noa, { onBreak = () => {} } = {}) {
    this.noa = noa
    this.onBreak = onBreak
    this.speed = 1
    this.coins = 0
    this.broken = 0
    this.key = null              // the block being dug, as 'x,y,z'
    this.progress = 0            // 0..1
    this.enabled = true
    const scene = noa.rendering.getScene()
    this.scene = scene

    // the crack shell, one material per stage
    this.crackMats = Array.from({ length: STAGES }, (_, i) => {
      const m = new StandardMaterial('crack' + i, scene)
      const t = new Texture(`tex/crack_${i + 1}.png`, scene, true, true, Texture.NEAREST_SAMPLINGMODE)
      t.hasAlpha = true
      m.diffuseTexture = t
      m.useAlphaFromDiffuseTexture = true
      m.specularColor = new Color3(0, 0, 0)
      m.backFaceCulling = true
      return m
    })
    this.shell = MeshBuilder.CreateBox('crack', { size: 1.004 }, scene)
    this.shell.isPickable = false
    noa.rendering.addMeshToScene(this.shell, false, [0, 0, 0])
    this.shell.setEnabled(false)

    this.particles = []
    this.partMats = {}
    noa.on('tick', dt => this.tick(dt))
    noa.on('beforeRender', dt => this.animate(dt))
  }

  /* The block under the crosshair, if it can be dug. */
  target() {
    const t = this.noa.targetedBlock
    if (!t) return null
    const b = byId[t.blockID]
    if (!b || b.hard >= UNBREAKABLE) return null
    return { pos: [...t.position], block: b }
  }

  tick(dt) {
    const t = this.enabled && this.noa.inputs.state.fire ? this.target() : null
    if (!t) { this.reset(); return }
    const key = t.pos.join(',')
    if (key !== this.key) { this.key = key; this.progress = 0 }
    this.progress += dt / 1000 / (t.block.hard / this.speed)
    if (this.progress >= 1) {
      this.break(t)
      this.reset()
      return
    }
    this.showShell(t.pos, Math.min(STAGES - 1, Math.floor(this.progress * STAGES)))
  }

  reset() {
    this.key = null
    this.progress = 0
    this.shell.setEnabled(false)
  }

  showShell(pos, stage) {
    const local = this.noa.globalToLocal([pos[0] + 0.5, pos[1] + 0.5, pos[2] + 0.5], null, [])
    this.shell.position.set(local[0], local[1], local[2])
    this.shell.material = this.crackMats[stage]
    this.shell.setEnabled(true)
  }

  break(t) {
    this.noa.setBlock(0, t.pos[0], t.pos[1], t.pos[2])
    this.coins += t.block.coins
    this.broken++
    this.burst(t.pos, t.block)
    this.onBreak({ block: t.block, pos: t.pos, coins: t.block.coins })
  }

  /* Eight small cubes of the block's own texture, thrown out and falling. */
  burst(pos, block) {
    const tex = [].concat(block.tex).slice(-1)[0]
    if (!this.partMats[tex]) {
      const m = new StandardMaterial('p_' + tex, this.scene)
      m.diffuseTexture = new Texture(`tex/${tex}.png`, this.scene, true, true, Texture.NEAREST_SAMPLINGMODE)
      m.specularColor = new Color3(0, 0, 0)
      this.partMats[tex] = m
    }
    for (let i = 0; i < 8; i++) {
      const box = MeshBuilder.CreateBox('part', { size: 0.14 }, this.scene)
      box.material = this.partMats[tex]
      box.isPickable = false
      const g = [pos[0] + 0.25 + Math.random() * 0.5, pos[1] + 0.25 + Math.random() * 0.5, pos[2] + 0.25 + Math.random() * 0.5]
      this.noa.rendering.addMeshToScene(box, false, g)
      this.particles.push({ box, g, v: [(Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4], age: 0 })
    }
  }

  animate(dt) {
    const s = dt / 1000
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.age += s
      p.v[1] -= 18 * s
      for (let k = 0; k < 3; k++) p.g[k] += p.v[k] * s
      const local = this.noa.globalToLocal(p.g, null, [])
      p.box.position.set(local[0], local[1], local[2])
      p.box.scaling.setAll(Math.max(0.01, 1 - p.age / 0.7))
      if (p.age > 0.7) { p.box.dispose(); this.particles.splice(i, 1) }
    }
  }
}
