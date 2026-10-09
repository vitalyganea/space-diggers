/* Row 27 check: the Moon, the open game's world, headless.   node tests/moon.mjs */
import { makeWorld, makeMoon, moonHeight, MOON, CORE_Y } from '../src/worldgen.js'
import { ID, byId } from '../src/blocks.js'
import { BUILDINGS, townVoxel } from '../src/town.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const ORES = [ID.copper_ore, ID.titanium_ore, ID.gold_ore, ID.stargem_ore, ID.helium_ore]
const name = id => byId[id] ? byId[id].name : 'air'

for (const seed of [1, 7, 42]) {
  const w = makeWorld(seed, { town: true })
  console.log(`  seed ${seed}`)
  ok(makeMoon(seed)(40, -30, 9) === w(40, -30, 9), '  the open game\'s world is the Moon')

  // the surface: a flat plain round the base, rolling ground with craters and boulders past it
  let plainFlat = true, low = 0, high = 0, boulders = 0
  for (let x = -120; x <= 120; x++) for (let z = -120; z <= 120; z++) {
    const h = moonHeight(seed, x, z), d = Math.hypot(x, z)
    if (d <= MOON.plain && (h !== 0 || (w(x, 1, z) !== 0 && townVoxel(x, 1, z) === -1))) plainFlat = false
    low = Math.min(low, h); high = Math.max(high, h)
    if (d > MOON.plain && w(x, h + 1, z) === ID.moonrock) boulders++
  }
  ok(plainFlat, `  the plain round the base is flat and clear out to ${MOON.plain} blocks`)
  ok(low <= -3, `  craters sink into the ground (down to ${low})`)
  ok(high >= 1 && high <= 6, `  and the ground rolls gently, rims and all (up to ${high})`)
  ok(boulders > 30, `  boulders lie about (${boulders} columns)`)
  ok(w(0, 0, 0) !== 0 || BUILDINGS.length > 0, '  the base stands at the spawn')

  // the layers
  const census = (y0, y1) => {
    const n = {}
    for (let y = y0; y >= y1; y--) for (let x = 30; x < 70; x++) for (let z = -20; z < 20; z++) { const k = name(w(x, y, z)); n[k] = (n[k] || 0) + 1 }
    const tot = Object.values(n).reduce((a, b) => a + b, 0)
    return Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v / tot]))
  }
  const rock = census(-8, -32), dark = census(-38, -62), ice = census(-68, -82), cry = census(-90, -98)
  const fmt = c => Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}`).join(', ')
  console.log('      rock:', fmt(rock)); console.log('      dark:', fmt(dark)); console.log('      ice: ', fmt(ice)); console.log('      cryst:', fmt(cry))
  ok(rock.moonrock > 0.6 && rock.copper_ore > 0.02 && rock.titanium_ore > 0.01 && !rock.gold_ore, '  moon rock: copper and titanium, no gold')
  ok(dark.darkrock > 0.6 && dark.gold_ore > 0.01 && dark.titanium_ore > 0.01, '  dark rock: gold and titanium, star gems from -55')
  ok(ice.ice + (ice.frost || 0) > 0.08 && ice.helium_ore > 0.01 && ice.air > 0.05, '  the ice caves: caves walled in ice, helium in the walls')
  ok(cry.crystal > 0.75 && (cry.stargem_ore || 0) > 0.005, '  crystal at the bottom, with star gems')
  let lava = 0, core = true
  for (let x = 20; x < 80; x += 2) for (let z = -30; z < 30; z += 2) { for (let y = -1; y > CORE_Y; y -= 2) if (w(x, y, z) === ID.lava) lava++; if (w(x, CORE_Y, z) !== ID.core) core = false }
  ok(lava === 0, '  no lava anywhere on the Moon')
  ok(core, `  the Core below it all at y ${CORE_Y}`)

  // ore in veins of 3–8, met by a straight shaft and showing in its walls
  const seen = new Set(), sizes = []
  for (let x = 30; x < 62; x++) for (let z = 0; z < 32; z++) for (let y = -6; y > -60; y--) {
    const k = `${x},${y},${z}`, id = w(x, y, z)
    if (!ORES.includes(id) || seen.has(k)) continue
    let n = 0; const st = [[x, y, z]]; seen.add(k)
    while (st.length) {
      const [a, b, c] = st.pop(); n++
      for (const [i, j, l] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const kk = `${a + i},${b + j},${c + l}`
        if (!seen.has(kk) && w(a + i, b + j, c + l) === id) { seen.add(kk); st.push([a + i, b + j, c + l]) }
      }
    }
    sizes.push(n)
  }
  sizes.sort((a, b) => a - b)
  const q = f => sizes[Math.floor(sizes.length * f)]
  ok(q(0.1) >= 3 && q(0.9) <= 9, `  veins of 3–8 blocks (p10 ${q(0.1)}, median ${q(0.5)}, p90 ${q(0.9)}, ${sizes.length} of them)`)
  let dug = 0, walls = 0, shafts = 0
  for (let sx = 22; sx < 60; sx += 5) for (let sz = -20; sz < 20; sz += 5) {
    shafts++
    for (let y = -1; y > -60; y--) {
      if (ORES.includes(w(sx, y, sz))) dug++
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (ORES.includes(w(sx + dx, y, sz + dz))) walls++
    }
  }
  ok(dug / shafts >= 3, `  a straight 60 m shaft digs through ore ${(dug / shafts).toFixed(1)} times (the Earth world: about once)`)
  ok(walls / shafts >= 10, `  and shows ${(walls / shafts).toFixed(1)} faces of ore in its walls, worth turning aside for`)
}
// speed: noa asks for a 32³ chunk at a time
{
  const w = makeWorld(3, { town: true }), t = Date.now()
  for (let x = 64; x < 96; x++) for (let y = -32; y < 0; y++) for (let z = 64; z < 96; z++) w(x, y, z)
  const ms = Date.now() - t
  ok(ms < 150, `a chunk generates in ${ms} ms`)
}
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
