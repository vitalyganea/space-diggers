/* Dev: animal characters. Three diggers on the arena grass in front of the
   player: the mole stands, the beaver walks a circle, the hamster digs.
   Each is a noa entity with the model as its mesh. */
import { createEngine } from '../engine.js'
import { registerBlocks } from '../blocks.js'
import { makeWorld } from '../worldgen.js'
import { applyLook } from '../look.js'
import { makeAnimal } from '../animals.js'
import { devHud } from './hud.js'

export function start() {
  const noa = createEngine({ playerStart: [0.5, 1, 0.5] })
  registerBlocks(noa)
  const world = makeWorld(42)
  noa.world.on('worldDataNeeded', (id, data, x, y, z) => {
    for (let i = 0; i < data.shape[0]; i++)
      for (let j = 0; j < data.shape[1]; j++)
        for (let k = 0; k < data.shape[2]; k++) data.set(i, j, k, world(x + i, y + j, z + k))
    noa.world.setChunkData(id, data)
  })
  applyLook(noa, { drill: false })
  const scene = noa.rendering.getScene()
  const reg = m => noa.rendering.addMeshToScene(m)
  const crew = [['mole', 'Mo', [-1.5, 1, 4.5]], ['beaver', 'Bev', [0.5, 1, 4.5]], ['hamster', 'Hami', [2.5, 1, 4.5]]]
    .map(([kind, label, pos]) => {
      const a = makeAnimal(scene, kind, label, reg)
      const id = noa.entities.add(pos, 0.6, 1.6, a.root, [0, 0, 0], false, false)
      a.root.rotation.y = Math.PI                     // face the player
      return { kind, a, id, home: pos }
    })
  let t = 0
  noa.on('beforeRender', dt => {
    t += dt / 1000
    const [mole, beaver, hamster] = crew
    mole.a.update(dt, 0, false)
    const ang = t * 1.2
    noa.entities.setPosition(beaver.id, [beaver.home[0] + Math.cos(ang) * 1.2, 1, beaver.home[2] + 1 + Math.sin(ang) * 1.2])
    beaver.a.root.rotation.y = -ang
    beaver.a.update(dt, 1, false)
    hamster.a.update(dt, 0, true)
  })
  noa.camera.heading = 0
  noa.camera.pitch = 0.12
  devHud(() => crew.map(c => c.kind).join(', '))
  window.__dev = { noa, crew }
}
