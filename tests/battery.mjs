/* System 17 check: the battery.   node tests/battery.mjs */
import { Battery, START_CAPACITY } from '../src/battery.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const b = new Battery()
ok(b.capacity === START_CAPACITY && b.charge === START_CAPACITY && !b.flat, 'starts full')
ok(b.blocksLeft(0.8) === 125 && b.blocksLeft(0.35) === 285, 'good for 125 stone or 285 dirt')
for (let i = 0; i < 90; i++) b.use(0.8)
ok(Math.abs(b.charge - 28) < 1e-9 && b.warn() === null, 'digging drains it by hardness (28 left after 90 stone)')
for (let i = 0; i < 5; i++) b.use(0.8)
ok(b.warn() === 0.25 && b.warn() === null, 'crossing 25% warns once')
for (let i = 0; i < 20; i++) b.use(0.8)
ok(b.warn() === 0.1 && b.warn() === null, 'crossing 10% warns once')
while (b.use(0.8)) {}
ok(b.flat && !b.use(0.35), 'flat: no more digging')
b.recharge()
ok(b.charge === b.capacity && b.warn() === null, 'a recharge fills it and clears the warnings')
b.drain = 2; b.use(1)
ok(b.charge === b.capacity - 2, 'the drain multiplier (for the lava zone) doubles the cost')
const back = new Battery(JSON.parse(JSON.stringify(b)).capacity, JSON.parse(JSON.stringify(b)).charge)
ok(back.charge === b.charge && back.capacity === b.capacity, 'saves and loads back')
ok(new Battery(-5, 9999).capacity === START_CAPACITY && new Battery(50, 9999).charge === 50, 'nonsense in a save is clamped')
const low = new Battery(100, 8)
ok(low.warn() === null, 'a battery saved already low does not warn again on load')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
