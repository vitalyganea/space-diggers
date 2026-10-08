import { Engine } from 'noa-engine'

const noa = new Engine({ debug: false, showFPS: true, chunkSize: 32, chunkAddDistance: 2.5, chunkRemoveDistance: 3.5 })
noa.registry.registerMaterial('dirt', { color: [0.45, 0.33, 0.2] })
noa.registry.registerMaterial('grass', { color: [0.3, 0.75, 0.25] })
const dirt = noa.registry.registerBlock(1, { material: 'dirt' })
const grass = noa.registry.registerBlock(2, { material: 'grass' })

function voxel(x, y, z) {
  const h = Math.floor(2 * Math.sin(x / 10) + 3 * Math.cos(z / 13))
  if (y < h - 1) return dirt
  if (y < h) return grass
  return 0
}
noa.world.on('worldDataNeeded', (id, data, x, y, z) => {
  for (let i = 0; i < data.shape[0]; i++)
    for (let j = 0; j < data.shape[1]; j++)
      for (let k = 0; k < data.shape[2]; k++) data.set(i, j, k, voxel(x + i, y + j, z + k))
  noa.world.setChunkData(id, data)
})
noa.entities.setPosition(noa.playerEntity, [0, 10, 0])
window.__noa = noa
console.log('SPIKE ready')
