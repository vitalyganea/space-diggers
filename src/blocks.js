/* Every block in the game: its textures, how long it takes to break (in
   seconds with the starting drill) and how many coins it pays. Ids are
   fixed, since saves and the world generator refer to them. */
export const BLOCKS = [
  { id: 1, name: 'grass', tex: ['grass_top', 'dirt', 'grass_side'], hard: 0.35, coins: 0 },
  { id: 2, name: 'dirt', tex: 'dirt', hard: 0.35, coins: 0 },
  { id: 3, name: 'stone', tex: 'stone', hard: 0.8, coins: 0 },
  { id: 4, name: 'deepstone', tex: 'deepstone', hard: 1.2, coins: 0 },
  { id: 5, name: 'basalt', tex: 'basalt', hard: 1.5, coins: 0 },
  { id: 6, name: 'lava', tex: 'lava', hard: 99, coins: 0 },
  { id: 7, name: 'crystal', tex: 'crystal', hard: 1.8, coins: 1 },
  { id: 8, name: 'coal_ore', tex: 'coal_ore', hard: 0.9, coins: 2 },
  { id: 9, name: 'iron_ore', tex: 'iron_ore', hard: 1.0, coins: 5 },
  { id: 10, name: 'gold_ore', tex: 'gold_ore', hard: 1.3, coins: 12 },
  { id: 11, name: 'gem_ore', tex: 'gem_ore', hard: 1.5, coins: 25 },
  { id: 12, name: 'core', tex: 'core', hard: 99, coins: 0 },
]
export const ID = Object.fromEntries(BLOCKS.map(b => [b.name, b.id]))
export const byId = Object.fromEntries(BLOCKS.map(b => [b.id, b]))

/* Register every texture as a material and every block with noa. */
export function registerBlocks(noa) {
  const mats = new Set(BLOCKS.flatMap(b => [].concat(b.tex)))
  for (const m of mats) noa.registry.registerMaterial(m, { textureURL: `tex/${m}.png` })
  for (const b of BLOCKS) noa.registry.registerBlock(b.id, { material: b.tex })
}
