/* Dev: block textures. A grass field with a pillar of every block, three
   high, in a row in front of the player; the camera is set to look along
   it, slightly down. */
import { createEngine } from '../engine.js'
import { BLOCKS, ID, registerBlocks } from '../blocks.js'
import { devHud } from './hud.js'

export function start() {
  const noa = createEngine({ playerStart: [0.5, 1, -4] })
  registerBlocks(noa)
  const pillars = BLOCKS
  function voxel(x, y, z) {
    if (y < 0) return y === -1 ? ID.regolith : ID.dust
    const i = (x + 13) / 2
    if (z === 2 && y < 3 && Number.isInteger(i) && i >= 0 && i < pillars.length) return pillars[i].id
    return 0
  }
  noa.world.on('worldDataNeeded', (id, data, x, y, z) => {
    for (let i = 0; i < data.shape[0]; i++)
      for (let j = 0; j < data.shape[1]; j++)
        for (let k = 0; k < data.shape[2]; k++) data.set(i, j, k, voxel(x + i, y + j, z + k))
    noa.world.setChunkData(id, data)
  })
  noa.camera.heading = 0
  noa.camera.pitch = 0.15
  devHud(() => 'left to right: ' + pillars.map(b => b.name).join(', '))
  window.__dev = { noa }
}
