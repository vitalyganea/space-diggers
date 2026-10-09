/* Row 37 check: the ringed planet's day.   node tests/sky.mjs */
import { planetAt, DAY } from '../src/sky.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const samples = Array.from({ length: 200 }, (_, i) => planetAt(i / 200 * DAY))
const el = samples.map(s => s.elev)
ok(Math.min(...el) > 0.1 && Math.max(...el) < 0.85, `always above the horizon (elevation ${Math.min(...el).toFixed(2)}..${Math.max(...el).toFixed(2)} rad)`)
ok(Math.max(...el) - Math.min(...el) > 0.5, 'it rises high and sinks low over the day')
const h0 = planetAt(0).heading, h1 = planetAt(DAY).heading
ok(Math.abs(h1 - h0 - Math.PI * 2) < 1e-9, `once round the sky in ${DAY / 60} minutes`)
ok(Math.abs(planetAt(1).heading - h0) < 0.01, 'slowly: a second moves it less than a degree')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
