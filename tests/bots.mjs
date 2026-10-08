/* System 7 check: bots race to the Core, headless (no noa, no browser).
   node tests/bots.mjs */
import { World } from '../src/world.js'
import { Bot } from '../src/bots.js'
import { LANES, CORE_Y } from '../src/worldgen.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }

const world = new World(42)
const skills = [0.95, 0.9, 0.85, 0.8, 0.75]
const bots = skills.map((skill, i) => new Bot(world, i + 1, { name: 'B' + (i + 1), skill }))
const dt = 1 / 30
let t = 0, stuck = null
const last = bots.map(b => ({ y: b.pos[1], t: 0 }))
const finishAt = {}
while (t < 600 && !bots.every(b => b.finished)) {
  for (const b of bots) b.tick(dt)
  t += dt
  bots.forEach((b, i) => {
    if (b.pos[1] < last[i].y - 0.5) last[i] = { y: b.pos[1], t }
    else if (!b.finished && t - last[i].t > 30 && !stuck) stuck = `${b.name} at ${b.pos.map(v => v.toFixed(1))} (${b.state})`
    if (b.finished && finishAt[b.name] === undefined) finishAt[b.name] = t
  })
}
console.log('    finish times:', bots.map(b => `${b.name} skill ${b.skill}: ${finishAt[b.name] ? finishAt[b.name].toFixed(0) + 's' : 'DNF'}`).join(', '))
console.log('    blocks dug:', bots.map(b => b.broken).join(' '), ' coins:', bots.map(b => b.coins).join(' '))
ok(!stuck, 'no bot ever stays at one depth for 30 s' + (stuck ? ` (${stuck})` : ''))
ok(bots.every(b => b.finished), 'every bot reaches the Core')
ok(bots.every(b => Math.floor(b.pos[1]) === CORE_Y + 1), `and stands on it (y ${CORE_Y + 1})`)
const times = bots.map(b => finishAt[b.name])
// skill counts, but so does ore: a lane that pays more buys a faster drill
// sooner (src/shop.js), so the order is not strictly by skill
const rank = [...times].sort((a, b) => a - b)
ok(rank.indexOf(times[0]) <= 1 && rank.indexOf(times[4]) >= 1,
   `the most skilled bot finishes near the front, the least never first (${times.map(v => v.toFixed(0)).join(', ')})`)
ok(times[0] > 120 && times[4] < 300, `a race of 2–5 minutes (${times[0].toFixed(0)}–${times[4].toFixed(0)} s)`)
ok(bots.every(b => b.coins > 0), 'every bot picks up ore on the way')
// lava: nobody dug through it, and each went round the designed pockets
let lavaGone = 0
for (const [k, v] of world.edits) if (v === 0 && world.gen(...k.split(',').map(Number)) === 6) lavaGone++
ok(lavaGone === 0, 'no lava was dug')
ok(bots.every(b => Math.abs(b.pos[0] - (b.lane - 2.5) * 10 - 0.5) > 0.4 || Math.abs(b.pos[2] - 0.5) > 0.4), 'every bot ended off its starting column (it had to go round the lava)')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
