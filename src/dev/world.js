/* Dev: world generation. The real round world, cut away for z > 0 so its
   layers show as a cliff face; the player floats (no gravity) at z = 30
   looking back at it. window.__dev.look(y) moves the view to a depth. */
import { createEngine } from '../engine.js'
import { registerBlocks } from '../blocks.js'
import { makeWorld, CORE_Y } from '../worldgen.js'
import { devHud } from './hud.js'

export function start() {
  const noa = createEngine({ playerStart: [0.5, -20, 24] })
  registerBlocks(noa)
  const world = makeWorld(42)
  noa.world.on('worldDataNeeded', (id, data, x, y, z) => {
    for (let i = 0; i < data.shape[0]; i++)
      for (let j = 0; j < data.shape[1]; j++)
        for (let k = 0; k < data.shape[2]; k++)
          data.set(i, j, k, z + k > 0 ? 0 : world(x + i, y + j, z + k))
    noa.world.setChunkData(id, data)
  })
  const body = noa.entities.getPhysics(noa.playerEntity).body
  body.gravityMultiplier = 0
  noa.camera.heading = Math.PI
  const look = (y) => { noa.entities.setPosition(noa.playerEntity, [0.5, y, 24]); body.velocity = [0, 0, 0] }
  devHud(() => `depth y ${noa.entities.getPosition(noa.playerEntity)[1].toFixed(0)}  (Core at ${CORE_Y})`)
  window.__dev = { noa, look }
}
