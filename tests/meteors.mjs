/* Row 38 check: where meteors strike and what they leave.   node tests/meteors.mjs */
import { impactSite, craterEdits, FIRST, EVERY_MIN, EVERY_MAX } from '../src/meteors.js'
import { MOON } from '../src/worldgen.js'
import { ID } from '../src/blocks.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
const sites = Array.from({ length: 300 }, () => impactSite(0.5, 0.5, rnd))
ok(sites.every(([x, z]) => Math.hypot(x, z) > MOON.plain), 'never on the base\'s plain')
const far = Array.from({ length: 300 }, () => { const [x, z] = impactSite(100.5, -40.5, rnd); return Math.hypot(x - 100.5, z + 40.5) })
ok(far.every(d => d >= 29 && d <= 62), `30–60 blocks from you (${Math.min(...far).toFixed(0)}..${Math.max(...far).toFixed(0)})`)
const edits = craterEdits(80, 10, () => 0, rnd)
const air = edits.filter(e => e[3] === 0), iron = edits.filter(e => e[3] === ID.meteor_ore), rock = edits.filter(e => e[3] === ID.meteorite)
ok(air.length > 15 && air.every(e => e[1] <= 0), `a bowl is blown out of the ground (${air.length} blocks)`)
ok(iron.length >= 8 && rock.length > iron.length, `and meteorite under it, with meteor iron to dig (${iron.length} iron, ${rock.length} rock)`)
ok(FIRST >= 120 && EVERY_MIN >= 300 && EVERY_MAX <= 900, `a rare treat: the first after ${FIRST / 60} min, then every ${EVERY_MIN / 60}–${EVERY_MAX / 60} min`)
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
