/* Dev: engine & controls. A flat stone floor with a wall to walk into, a
   one-block step to jump onto, a two-block one that cannot be jumped, and a
   pit. Click to lock the mouse; WASD, Space. window.__dev reports the
   player's state for the tests. */
import { createEngine, playerState } from '../engine.js'
import { devHud } from './hud.js'

export function start() {
  const noa = createEngine()
  noa.registry.registerMaterial('stone', { color: [0.55, 0.55, 0.58] })
  noa.registry.registerMaterial('wall', { color: [0.75, 0.35, 0.25] })
  noa.registry.registerMaterial('step', { color: [0.3, 0.55, 0.85] })
  const stone = noa.registry.registerBlock(1, { material: 'stone' })
  const wall = noa.registry.registerBlock(2, { material: 'wall' })
  const step = noa.registry.registerBlock(3, { material: 'step' })

  function voxel(x, y, z) {
    if (y < 0) return (x >= 3 && x <= 5 && z >= -3 && z <= -1 && y >= -3) ? 0 : stone  // the pit
    if (z === -8 && x >= -6 && x <= 6 && y < 4) return wall                            // a wall ahead
    if (x === 2 && z === 2 && y === 0) return step                                     // jumpable
    if (x === 2 && z === 4 && y <= 1) return step                                      // too high
    return 0
  }
  noa.world.on('worldDataNeeded', (id, data, x, y, z) => {
    for (let i = 0; i < data.shape[0]; i++)
      for (let j = 0; j < data.shape[1]; j++)
        for (let k = 0; k < data.shape[2]; k++) data.set(i, j, k, voxel(x + i, y + j, z + k))
    noa.world.setChunkData(id, data)
  })
  devHud(() => JSON.stringify(playerState(noa), null, 1))
  window.__dev = { noa, state: () => playerState(noa),
    teleport: (x, y, z) => noa.entities.setPosition(noa.playerEntity, [x, y, z]) }
}
