/* System 22 check, the parts with no screen: robot talents and Sonar's
   sense of direction.   node tests/companion.mjs */
import { ROBOTS } from '../src/robots.js'
import { direction } from '../src/companion.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
ok(Object.keys(ROBOTS).join() === 'bzz,bolt,sonar', 'three robots to choose from')
ok(ROBOTS.bzz.tripSpeed === 2 && ROBOTS.bolt.bagBonus === 10 && ROBOTS.sonar.sonar, 'each with its own talent')
ok(new Set(Object.values(ROBOTS).map(r => r.talent)).size === 3, 'and no two alike')
// heading 0 looks down +z; +x is then to the right (D strafes that way, tests/controls)
ok(direction({ x: 0, y: 0, z: 4 }, 0) === 'ahead' && direction({ x: 0, y: 0, z: -4 }, 0) === 'behind you', 'ahead and behind')
ok(direction({ x: 0, y: -5, z: 1 }, 0) === 'below you' && direction({ x: 1, y: 4, z: 0 }, 0) === 'above you', 'below and above')
const l = direction({ x: 4, y: 0, z: 0 }, 0), r = direction({ x: -4, y: 0, z: 0 }, 0)
ok(l !== r && [l, r].sort().join() === 'to your left,to your right', `left and right are told apart (+x: ${l})`)
ok(direction({ x: 4, y: 0, z: 0 }, Math.PI / 2) === 'ahead', 'turned to face +x, it is ahead')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
