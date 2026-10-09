/* Row 33 check: charging.   node tests/charging.mjs */
import { chargeRate, onPad, STATION_RATE, TRICKLE_RATE } from '../src/charging.js'
import { World } from '../src/world.js'
import { ID } from '../src/blocks.js'
import { SPAWN } from '../src/town.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const w = new World(5, { town: true })
let pad = 0; for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (w.get(x, 0, z) === ID.charger) pad++
ok(pad === 9 && w.get(0, 1, 0) === 0, 'a 3×3 charging pad in the middle of the base, open above')
ok(onPad(SPAWN), 'the spawn, where a ticket home lands, is on the pad')
ok(onPad([1.9, 1, -0.9]) && !onPad([2.1, 1, 0.5]) && !onPad([0.5, -5, 0.5]), 'on it means standing on its blocks')
ok(1 / STATION_RATE <= 5, `the pad fills an empty battery in ${(1 / STATION_RATE).toFixed(0)} s`)
const trickleMin = 1 / TRICKLE_RATE / 60
ok(trickleMin >= 3 && trickleMin <= 6, `anywhere else it trickles back: empty to full in ${trickleMin.toFixed(1)} min`)
ok(chargeRate([30.5, 1, 0.5], 0, false) === TRICKLE_RATE && chargeRate([30.5, -20, 0.5], 21, false) === TRICKLE_RATE, 'the trickle works on the surface and underground')
ok(chargeRate([30.5, -20, 0.5], 21, true) === 0 && chargeRate([30.5, 1, 0.5], 0, true) === TRICKLE_RATE, 'flat and deep, it waits for the stranded card; flat on the surface, it trickles')
ok(chargeRate(SPAWN, 0, true) === STATION_RATE, 'the pad charges even a flat battery')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
