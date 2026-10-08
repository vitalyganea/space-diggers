/* Dev: the look. The real world at lane 0 with a 3x3 shaft dug from the
   surface to y -90 beside the player, so the walls can be seen at any
   depth. window.__dev.at(y, pitch) floats the player at that depth in the
   shaft. Dig with the left button to see the drill work. */
import { createEngine, playerState } from '../engine.js'
import { registerBlocks } from '../blocks.js'
import { makeWorld } from '../worldgen.js'
import { Digger } from '../digging.js'
import { applyLook } from '../look.js'
import { addCrosshair } from '../ui/crosshair.js'
import { devHud } from './hud.js'

export function start() {
  const noa = createEngine({ playerStart: [0.5, 1, -6] })
  registerBlocks(noa)
  const world = makeWorld(42)
  const voxel = (x, y, z) => (x >= -1 && x <= 1 && z >= -1 && z <= 1 && y <= 0 && y > -90) ? 0 : world(x, y, z)
  noa.world.on('worldDataNeeded', (id, data, x, y, z) => {
    for (let i = 0; i < data.shape[0]; i++)
      for (let j = 0; j < data.shape[1]; j++)
        for (let k = 0; k < data.shape[2]; k++) data.set(i, j, k, voxel(x + i, y + j, z + k))
    noa.world.setChunkData(id, data)
  })
  const digger = new Digger(noa)
  const look = applyLook(noa)
  addCrosshair()
  const body = noa.entities.getPhysics(noa.playerEntity).body
  const at = (y, pitch = 0.2, heading = 0) => {
    body.gravityMultiplier = y < 0.5 ? 0 : 1
    noa.entities.setPosition(noa.playerEntity, [0.5, y, 0.5])
    body.velocity = [0, 0, 0]
    noa.camera.pitch = pitch; noa.camera.heading = heading
  }
  devHud(() => JSON.stringify(playerState(noa)))
  window.__dev = { noa, digger, look, at, state: () => playerState(noa) }
}
