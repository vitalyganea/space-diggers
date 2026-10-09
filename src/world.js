/* The round's world as the game knows it: the generator plus every block
   changed since (dug out, placed, blown up). This, not noa, is the truth.
   noa only draws the chunks near the player, and builds each one from here
   when it loads; bots dig and fall in this world wherever they are, loaded
   or not. Real multiplayer will keep this same shape on the server. */
import { makeWorld } from './worldgen.js'

const key = (x, y, z) => `${x},${y},${z}`

export class World {
  constructor(seed = 1, opts = {}) {
    this.seed = seed
    this.gen = makeWorld(seed, opts)
    this.edits = new Map()
    this.noa = null
  }

  get(x, y, z) {
    const k = key(x, y, z)
    return this.edits.has(k) ? this.edits.get(k) : this.gen(x, y, z)
  }

  /* Change a block, and the picture of it if noa has that chunk loaded. */
  set(x, y, z, id) {
    this.edits.set(key(x, y, z), id)
    if (this.noa) this.noa.setBlock(id, x, y, z)
  }

  /* Hand noa its chunks from this world. */
  attach(noa) {
    this.noa = noa
    noa.world.on('worldDataNeeded', (id, data, x, y, z) => {
      for (let i = 0; i < data.shape[0]; i++)
        for (let j = 0; j < data.shape[1]; j++)
          for (let k = 0; k < data.shape[2]; k++) data.set(i, j, k, this.get(x + i, y + j, z + k))
      noa.world.setChunkData(id, data)
    })
    return this
  }
}
