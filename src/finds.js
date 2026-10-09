/* Finds (row 47): now and then a dug block holds something besides ore,
   the luck that keeps a digger digging. Each find is in a set (the
   Museum's collections, row 48) and found at the depths that suit it; its
   rarity says how often, its colour and its worth. Sold at the Trade Hub
   like ore, or given to the Museum to complete a set.

   A find takes a backpack slot like anything else. */
export const RARITY = {
  common: { name: 'Common', colour: '#cbd5e1', weight: 55, value: 8 },
  uncommon: { name: 'Uncommon', colour: '#4ade80', weight: 25, value: 18 },
  rare: { name: 'Rare', colour: '#38bdf8', weight: 13, value: 40 },
  epic: { name: 'Epic', colour: '#c084fc', weight: 5, value: 90 },
  legendary: { name: 'Legendary', colour: '#fbbf24', weight: 1.8, value: 220 },
  mythic: { name: 'Mythic', colour: '#f472b6', weight: 0.2, value: 600 },
}
export const RARITIES = Object.keys(RARITY)

/* The sets, top to bottom of the Moon. from/to: depths in metres. reward:
   coins for completing the set at the Museum. */
export const SETS = {
  moonrocks: { name: 'Moon Rocks', from: 0, to: 40, reward: 150, finds: [
    ['pebble', 'Moon pebble', 'common', '🪨'], ['bead', 'Glass bead', 'common', '🔮'], ['craterstone', 'Crater stone', 'uncommon', '🌑'],
    ['moonpearl', 'Moon pearl', 'rare', '⚪'], ['firstrock', 'The first moon rock', 'legendary', '🌕']] },
  probes: { name: 'Lost Probes', from: 5, to: 70, reward: 300, finds: [
    ['bolt', 'Old bolt', 'common', '🔩'], ['antenna', 'Bent antenna', 'uncommon', '📡'], ['solarcell', 'Solar cell', 'uncommon', '🔋'],
    ['camera', 'Probe camera', 'rare', '📷'], ['goldenrecord', 'Golden record', 'epic', '💿']] },
  fossils: { name: 'Space Fossils', from: 30, to: 90, reward: 600, finds: [
    ['starshell', 'Star shell', 'uncommon', '🐚'], ['fern', 'Alien fern', 'rare', '🌿'], ['trilobite', 'Space trilobite', 'rare', '🦐'],
    ['bone', 'Giant moon bone', 'epic', '🦴'], ['helmet', 'Dino astronaut helmet', 'legendary', '🦖']] },
  // the Ice Moon's (row 58)
  frozen: { name: 'Frozen Wonders', planet: 'ice', from: 0, to: 100, reward: 1200, finds: [
    ['snowflake', 'Fossil snowflake', 'common', '❄️'], ['fish', 'Frozen space fish', 'uncommon', '🐟'], ['tusk', 'Ice mammoth tusk', 'rare', '🦣'],
    ['footprint', 'Yeti footprint cast', 'epic', '👣'], ['frozenstar', 'Frozen star', 'legendary', '⭐']] },
  crystals: { name: 'Crystal Wonders', from: 60, to: 100, reward: 1000, finds: [
    ['icecrystal', 'Ice crystal', 'uncommon', '🧊'], ['bubble', 'Helium bubble', 'rare', '🫧'], ['geode', 'Glowing geode', 'epic', '💠'],
    ['comet', 'Comet heart', 'legendary', '☄️'], ['heart', 'Heart of the Moon', 'mythic', '💖']] },
}

/* Every find by key: { key, name, rarity, icon, set, value } */
export const FINDS = {}
for (const [set, S] of Object.entries(SETS)) for (const [key, name, rarity, icon] of S.finds) FINDS[key] = { key, name, rarity, icon, set, value: RARITY[rarity].value }

export const FIND_CHANCE = 0.025          // a find in one dug block in forty

/* What a dug block at `depth` holds, if anything: a find's key or null.
   rnd() is 0..1. First the chance, then a rarity by weight among the finds
   that can be found at this depth. */
export function rollFind(depth, rnd = Math.random, planet = 'moon') {
  if (rnd() >= FIND_CHANCE) return null
  const here = Object.values(FINDS).filter(f => (SETS[f.set].planet || 'moon') === planet && depth >= SETS[f.set].from && depth <= SETS[f.set].to)
  if (!here.length) return null
  const total = here.reduce((a, f) => a + RARITY[f.rarity].weight / countOf(here, f.rarity), 0)
  let r = rnd() * total
  for (const f of here) { r -= RARITY[f.rarity].weight / countOf(here, f.rarity); if (r <= 0) return f.key }
  return here[here.length - 1].key
}
const countOf = (list, rarity) => list.filter(f => f.rarity === rarity).length
