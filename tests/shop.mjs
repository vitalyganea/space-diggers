/* System 9 check: what coins buy, and bots that buy.   node tests/shop.mjs */
import { DRILL, BOMB_COST, MAX_BOMBS, buyDrill, buyBomb, nextDrill } from '../src/shop.js'
import { World } from '../src/world.js'
import { Bot } from '../src/bots.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const h = { coins: 10, speed: 1, drillLevel: 1, bombs: 0 }
ok(!buyDrill(h) && h.drillLevel === 1 && h.coins === 10, 'not enough for the drill: nothing happens')
h.coins = 200
ok(buyDrill(h) && h.drillLevel === 2 && h.speed === 1.3 && h.coins === 185, 'drill 2 for 15: faster')
ok(buyDrill(h) && buyDrill(h) && h.drillLevel === 4 && h.speed === 2 && h.coins === 65, 'up to drill 4 (40 + 80)')
ok(!buyDrill(h) && nextDrill(h) === null, 'and no further')
ok(buyBomb(h) && h.bombs === 1 && h.coins === 45, `a bomb for ${BOMB_COST}`)
h.coins = 999
ok(buyBomb(h) && buyBomb(h) && !buyBomb(h) && h.bombs === MAX_BOMBS, `at most ${MAX_BOMBS} carried`)
ok(DRILL.every((d, i) => i === 0 || (d.cost > DRILL[i - 1].cost && d.speed > DRILL[i - 1].speed)), 'each level dearer and faster')

// bots spend their ore on the drill, and the race stays 2–5 minutes
const world = new World(42)
const bots = [0.95, 0.85, 0.75].map((skill, i) => new Bot(world, i + 1, { skill }))
let t = 0
const done = {}
while (t < 600 && !bots.every(b => b.finished)) {
  for (const b of bots) b.tick(1 / 30)
  t += 1 / 30
  bots.forEach((b, i) => { if (b.finished && done[i] === undefined) done[i] = t })
}
console.log('    drills:', bots.map(b => b.drillLevel).join(' '), ' finish:', Object.values(done).map(v => v.toFixed(0) + 's').join(' '))
ok(bots.every(b => b.drillLevel >= 2), 'every bot upgraded its drill on the way down')
ok(bots.every(b => b.finished) && Math.min(...Object.values(done)) > 120 && Math.max(...Object.values(done)) < 300,
   'the race is still 2–5 minutes with upgrades')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
