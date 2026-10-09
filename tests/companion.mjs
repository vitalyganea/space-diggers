/* System 22 check, the parts with no screen: robot talents and Sonar's
   sense of direction.   node tests/companion.mjs */
import { ROBOTS } from '../src/robots.js'
import { direction, followSpot } from '../src/companion.js'
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
// where it keeps (row 34): out of your view unless it is speaking; Bolt on the ground
const open = () => true, flatGround = (x, y, z) => y >= 1          // air above y 1, ground below
const p = [0.5, 1, 0.5], fwdOf = q => (q[2] - p[2])                 // heading 0: forward is +z
const quiet = followSpot(p, 0, false, false, open), talking = followSpot(p, 0, false, true, open)
ok(fwdOf(quiet) < 0 && quiet[0] > p[0] && quiet[1] > p[1] + 1.6, `a drone keeps by your right shoulder, a little behind, out of view (${quiet.map(v => v.toFixed(1))})`)
ok(fwdOf(talking) > 1.5 && talking[0] > p[0], `and comes round in front of you to speak (${talking.map(v => v.toFixed(1))})`)
ok(followSpot(p, Math.PI / 2, false, false, open)[2] < p[2] - 0.5, 'by the right shoulder whichever way you face (facing +x, right is -z)')
const rover = followSpot(p, 0, true, false, flatGround)
ok(Math.abs(rover[1] - 1.05) < 0.01 && fwdOf(rover) < -1, `Bolt rolls on the ground behind you (${rover.map(v => v.toFixed(1))})`)
ok(fwdOf(followSpot(p, 0, true, true, flatGround)) > 1, 'and comes out in front to speak')
const shaft = (x, y, z) => Math.floor(x) === 0 && Math.floor(z) === 0     // a shaft one block wide
const inShaft = followSpot([0.5, -20, 0.5], 0, true, false, shaft)
ok(Math.floor(inShaft[0]) === 0 && Math.floor(inShaft[2]) === 0 && inShaft[1] > -18, 'in a one-block shaft it climbs the wall over your head')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
