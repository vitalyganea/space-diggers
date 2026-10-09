/* Dev: digging. The real round world at lane 0, plus a row of known blocks
   standing on the grass at z = 3 (x -2..2: coal, iron, gold, lava, Core).
   Hold the left button to dig. window.__dev.aim(x, z, pitch) stands the
   player at (x, z) on the surface looking +z with that pitch. */
import { createEngine, playerState } from '../engine.js'
import { ID, registerBlocks } from '../blocks.js'
import { makeWorld } from '../worldgen.js'
import { Digger } from '../digging.js'
import { addCrosshair } from '../ui/crosshair.js'
import { devHud } from './hud.js'

export function start() {
  const noa = createEngine({ playerStart: [0.5, 1, 0.5] })
  registerBlocks(noa)
  const world = makeWorld(42)
  const row = [ID.copper_ore, ID.titanium_ore, ID.gold_ore, ID.lava, ID.core]
  const voxel = (x, y, z) => (y === 1 && z === 3 && x >= -2 && x <= 2) ? row[x + 2] : world(x, y, z)
  noa.world.on('worldDataNeeded', (id, data, x, y, z) => {
    for (let i = 0; i < data.shape[0]; i++)
      for (let j = 0; j < data.shape[1]; j++)
        for (let k = 0; k < data.shape[2]; k++) data.set(i, j, k, voxel(x + i, y + j, z + k))
    noa.world.setChunkData(id, data)
  })
  const log = []
  const digger = new Digger(noa, { onBreak: e => log.push({ name: e.block.name, coins: e.coins, pos: e.pos, t: performance.now() }) })
  addCrosshair()
  const aim = (x, z, pitch, y = 1) => {
    noa.entities.setPosition(noa.playerEntity, [x, y, z])
    noa.camera.heading = 0
    noa.camera.pitch = pitch
  }
  devHud(() => `coins ${digger.coins}  broken ${digger.broken}  progress ${digger.progress.toFixed(2)}\n` +
    `target ${noa.targetedBlock ? noa.targetedBlock.position.join(',') + ' id ' + noa.targetedBlock.blockID : '-'}\n` +
    JSON.stringify(playerState(noa)))
  window.__dev = { noa, digger, log, aim, state: () => playerState(noa),
    target: () => noa.targetedBlock && { pos: [...noa.targetedBlock.position], id: noa.targetedBlock.blockID },
    block: (x, y, z) => noa.getBlock(x, y, z) }
}
