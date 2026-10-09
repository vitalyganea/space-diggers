/* System 3 check: the world generator, headless.   node tests/worldgen.mjs */
import { makeWorld, LANE_GAP, LANES, CORE_Y, LAYERS, laneX } from '../src/worldgen.js'
import { ID, byId } from '../src/blocks.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const w = makeWorld(42)

// what each layer is made of, over a 40x40 patch
function census(y0, y1) {
  const n = {}
  for (let y = y0; y >= y1; y--) for (let x = -20; x < 20; x++) for (let z = -20; z < 20; z++) {
    const id = w(x, y, z); n[id] = (n[id] || 0) + 1
  }
  const tot = Object.values(n).reduce((a, b) => a + b, 0)
  return Object.fromEntries(Object.entries(n).map(([k, v]) => [byId[k] ? byId[k].name : 'air', v / tot]))
}
const show = c => Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(', ')

ok(w(0, 1, 0) === 0 && w(0, 0, 0) === ID.regolith, 'air above, regolith on the surface')
const dirt = census(-1, -3); console.log('    dirt band:', show(dirt))
ok(dirt.dust > 0.85, 'dust under the regolith (its bottom wobbles a block, so some rock shows by y -3)')
const stone = census(-8, -33); console.log('    stone band:', show(stone))
ok(stone.moonrock > 0.7 && stone.copper_ore > 0.015 && stone.titanium_ore > 0.005 && !stone.gold_ore, 'moon rock with copper and titanium, no gold')
ok(stone.air > 0.01 && stone.air < 0.15, `caves open in the stone, but not much of it (${(stone.air * 100).toFixed(1)}%)`)
const deep = census(-38, -63); console.log('    deep band:', show(deep))
ok(deep.darkrock > 0.7 && deep.gold_ore > 0.008 && deep.stargem_ore > 0.002, 'dark rock with gold and star gems')
const bas = census(-68, -83); console.log('    basalt band:', show(bas))
ok(bas.basalt > 0.5 && bas.lava > 0.03 && bas.lava < 0.3, 'basalt with lava pockets you must dig around')
const cry = census(-88, -98); console.log('    crystal band:', show(cry))
ok(cry.crystal > 0.9, 'crystal above the Core')
let core = true
for (let x = -30; x < 30; x += 3) for (let z = -30; z < 30; z += 3) if (w(x, CORE_Y, z) !== ID.core) core = false
ok(core, `the Core is everywhere at y ${CORE_Y}`)

// fairness: the straight shaft under each lane costs about the same, in
// seconds of digging, lava pockets in the way, and coins on the way
import { byId as B } from '../src/blocks.js'
const shafts = Array.from({ length: LANES }, (_, i) => {
  const x = Math.floor(laneX(i)); let secs = 0, lava = 0, coins = 0
  for (let y = -1; y > CORE_Y; y--) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const b = B[w(x + dx, y, dz)]; if (!b) continue
    if (b.name === 'lava') lava++; else secs += b.hard / 4; coins += b.coins / 4
  }
  return { secs, lava, coins }
})
console.log('    shafts:', shafts.map(s => `${s.secs.toFixed(0)}s/${s.lava}lava/${s.coins.toFixed(0)}c`).join('  '))
const spread = k => { const v = shafts.map(s => s[k]); return (Math.max(...v) - Math.min(...v)) / (v.reduce((a, b) => a + b) / v.length) }
ok(spread('secs') < 0.12, `digging time down each lane within 12% (${(spread('secs') * 100).toFixed(0)}%)`)
ok(spread('lava') === 0 && shafts[0].lava > 0, `the same lava in every lane's way (${shafts[0].lava} blocks of it)`)
ok(spread('coins') < 0.8, `ore on the way comparable (${(spread('coins') * 100).toFixed(0)}% spread)`)
ok(new Set(Array.from({ length: LANES }, (_, i) => laneX(i) - laneX(0))).size === LANES &&
   (laneX(1) - laneX(0)) === LANE_GAP, `${LANES} lanes, ${LANE_GAP} apart`)
// layer boundaries are where the spec says, give or take the wobble
const firstStone = (() => { for (let y = 0; y > -20; y--) if (w(3, y, 3) !== ID.dust && w(3, y, 3) !== ID.regolith) return y })()
ok(firstStone <= LAYERS.dirt + 2 && firstStone >= LAYERS.dirt - 2, `stone starts near y ${LAYERS.dirt} (here ${firstStone})`)
ok(makeWorld(42)(5, -40, 7) === w(5, -40, 7) && makeWorld(43)(5, -40, 7) !== undefined, 'same seed, same world')
// the surface: a flat arena, hills and boulders outside it
import { ARENA, surfaceHeight } from '../src/worldgen.js'
let flat = true, boulders = 0, bouldersIn = 0, maxH = 0
for (let x = -90; x <= 90; x++) for (let z = -60; z <= 60; z++) {
  const inArena = Math.abs(x) <= ARENA.x && Math.abs(z) <= ARENA.z
  const h = surfaceHeight(42, x, z); maxH = Math.max(maxH, h)
  if (inArena && (h !== 0 || w(x, 1, z) !== 0)) flat = false
  if (w(x, h + 1, z) === ID.moonrock) { boulders++; if (inArena) bouldersIn++ }
}
ok(flat, 'the arena is flat open regolith')
ok(boulders > 40 && bouldersIn === 0, `boulders outside the arena (${boulders} columns of them), none in it`)
ok(maxH >= 3 && maxH <= 7, `hills outside, up to ${maxH} blocks`)
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
