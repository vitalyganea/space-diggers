/* Row 44 check: the creatures' rules.   node tests/creatures.mjs */
import { pupGift, inView, PUP_GIFTS, WORM_BELOW, BAT_STEAL } from '../src/creatures.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const n = { gold: 0, helium: 0, stargem: 0 }
for (let i = 0; i < 1000; i++) n[pupGift(i / 1000)]++
ok(n.gold > n.helium && n.helium > n.stargem && n.stargem > 0, `a fed rock pup brings gold mostly, helium, and now and then a star gem (${JSON.stringify(n)})`)
ok(Math.abs(PUP_GIFTS.reduce((a, [, p]) => a + p, 0) - 1) < 1e-9, 'its gifts add up')
ok(inView([0, 0, 1], [0.2, 0, 5]) && !inView([0, 0, 1], [5, 0, 1]) && !inView([0, 0, 1], [0, 0, -5]), 'a bat is "looked at" when it is near the middle of your view')
ok(BAT_STEAL === 1, 'a bat pinches one coin, never more')
ok(WORM_BELOW <= -30, `the rock worm lives deep (below ${-WORM_BELOW} m), away from the first digging`)
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
