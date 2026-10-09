/* Every block in the game: its textures, how long it takes to break (in
   seconds with the starting drill) and how many coins it pays. Ids are
   fixed, since saves and the world generator refer to them. Space
   Diggers (row 26) kept the ids of the Earth game and gave them new names
   and looks: grass became regolith, coal copper, trees ice, the town's
   bricks a metal hull. */
export const BLOCKS = [
  { id: 1, name: 'regolith', tex: ['regolith_top', 'dust', 'regolith_side'], hard: 0.35, coins: 0 },
  { id: 2, name: 'dust', tex: 'dust', hard: 0.35, coins: 0 },
  { id: 3, name: 'moonrock', tex: 'moonrock', hard: 0.8, coins: 0 },
  { id: 4, name: 'darkrock', tex: 'darkrock', hard: 1.2, coins: 0 },
  { id: 5, name: 'basalt', tex: 'basalt', hard: 1.5, coins: 0 },
  { id: 6, name: 'lava', tex: 'lava', hard: 99, coins: 0 },
  { id: 7, name: 'crystal', tex: 'crystal', hard: 1.8, coins: 1 },
  { id: 8, name: 'copper_ore', tex: 'copper_ore', hard: 0.9, coins: 2 },
  { id: 9, name: 'titanium_ore', tex: 'titanium_ore', hard: 1.0, coins: 5 },
  { id: 10, name: 'gold_ore', tex: 'gold_ore', hard: 1.3, coins: 12 },
  { id: 11, name: 'stargem_ore', tex: 'stargem_ore', hard: 1.5, coins: 25 },
  { id: 12, name: 'core', tex: 'core', hard: 99, coins: 0 },
  { id: 13, name: 'ice', tex: 'ice', hard: 0.6, coins: 0 },
  { id: 14, name: 'frost', tex: 'frost', hard: 0.15, coins: 0 },
  { id: 15, name: 'rubble', tex: 'rubble', hard: 0.5, coins: 0 },
  // the space base: none of it can be dug or blown up (hard 99)
  { id: 16, name: 'floor', tex: 'floor', hard: 99, coins: 0 },
  { id: 17, name: 'hull', tex: 'hull', hard: 99, coins: 0 },
  { id: 18, name: 'solar', tex: 'solar', hard: 99, coins: 0 },
  { id: 19, name: 'glass', tex: 'glass', hard: 99, coins: 0 },
  { id: 20, name: 'deck', tex: 'deck', hard: 99, coins: 0 },
  { id: 21, name: 'light_green', tex: 'light_green', hard: 99, coins: 0 },
  { id: 22, name: 'light_red', tex: 'light_red', hard: 99, coins: 0 },
  { id: 23, name: 'light_blue', tex: 'light_blue', hard: 99, coins: 0 },
  { id: 24, name: 'light_yellow', tex: 'light_yellow', hard: 99, coins: 0 },
  { id: 25, name: 'light_purple', tex: 'light_purple', hard: 99, coins: 0 },
  { id: 26, name: 'portal', tex: 'portal', hard: 99, coins: 0 },
  // ore that glows in the dark (row 27 places it)
  { id: 27, name: 'helium_ore', tex: 'helium_ore', hard: 1.4, coins: 0 },
  // the charging pad in the middle of the base (row 33)
  { id: 28, name: 'charger', tex: 'charger', hard: 99, coins: 0 },
]
export const ID = Object.fromEntries(BLOCKS.map(b => [b.name, b.id]))

/* Every block texture in one vertical strip, public/tex/atlas.png, in this
   order (tools/make-textures.mjs writes it from this same list). One atlas
   means one terrain material, so noa draws each chunk in one call instead
   of one per texture: meshes in the scene went from 226 to 54. (Headless
   Chrome's software GPU stayed at ~9 fps either way; it is bound by
   pixels, not draw calls. See SYSTEMS.md row 9.) */
export const ATLAS = [...new Set(BLOCKS.flatMap(b => [].concat(b.tex)))]
export const byId = Object.fromEntries(BLOCKS.map(b => [b.id, b]))

/* Register every texture as a material and every block with noa. */
export function registerBlocks(noa) {
  ATLAS.forEach((m, i) => noa.registry.registerMaterial(m, { textureURL: 'tex/atlas.png', atlasIndex: i }))
  for (const b of BLOCKS) noa.registry.registerBlock(b.id, { material: b.tex })
}
