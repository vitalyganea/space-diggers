/* System 18 check: the ways out when stranded.   node tests/stranded.mjs */
import { Rescue, rechargeCost, tripTime, FREE_WAIT } from '../src/stranded.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
ok(rechargeCost(0) === 10 && rechargeCost(50) === 35 && rechargeCost(99) === 59, 'a recharge costs more the deeper you are (10, 35 at 50, 59 at 99)')
ok(tripTime(10) < tripTime(80) && tripTime(80, 2) === tripTime(80) / 2, 'the robot\'s trip is longer deeper, shorter with a faster robot')
const r = new Rescue()
ok(r.sendRobot('gold', 12, 60) && !r.sendRobot('copper', 2, 60) && !r.callFree(), 'one job at a time')
let done = null
for (let t = 0; t < tripTime(60) - 0.1; t += 0.1) if (r.tick(0.1)) done = 'early'
ok(done === null && r.left() > 0, `the robot is away ${tripTime(60).toFixed(0)} s`)
for (let t = 0; t < 1 && !done; t += 0.1) done = r.tick(0.1)
ok(done && done.kind === 'trip' && done.value === 12 && !r.busy, 'then it is back with the gold\'s 12 coins, once')
ok(r.callFree() && Math.round(r.left()) === FREE_WAIT, `the free rescue takes ${FREE_WAIT} s`)
let free = null
for (let t = 0; t <= FREE_WAIT + 0.2 && !free; t += 0.1) free = r.tick(0.1)
ok(free && free.kind === 'free', 'and always comes')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
