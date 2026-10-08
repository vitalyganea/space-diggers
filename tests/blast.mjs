/* System 10 check: blasts, knocks and bombing bots, headless.   node tests/blast.mjs */
import { World } from '../src/world.js'
import { blast, knocked, stocks, BLAST_R, KNOCK_R, DAZE } from '../src/blast.js'
import { Bot } from '../src/bots.js'
import { ID } from '../src/blocks.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }

const w = new World(42)
w.set(100, -20, 100, ID.gold_ore); w.set(101, -20, 100, ID.lava); w.set(100, -21, 101, ID.core)
const res = blast(w, [100.5, -19.5, 100.5])
const vol = 4 / 3 * Math.PI * BLAST_R ** 3
ok(res.broken.length > vol * 0.7 && res.broken.length < vol * 1.2, `a blast clears a ball of about ${vol.toFixed(0)} blocks (${res.broken.length})`)
ok(w.get(100, -20, 100) === 0 && res.coins >= 12, `it takes the gold ore and pays for it (${res.coins} coins)`)
ok(w.get(101, -20, 100) === ID.lava && w.get(100, -21, 101) === ID.core, 'lava and the Core are left alone')
ok(w.get(100, -19 + 3, 100) !== 0 || w.gen(100, -16, 100) === 0, 'nothing beyond its radius goes')
const near = { pos: [100.5, -20, 102.5] }, far = { pos: [100.5, -20, 105.5] }
ok(knocked([100.5, -19.5, 100.5], [near, far]).length === 1, `racers within ${KNOCK_R} are knocked, further ones not`)
ok(stocks(ID.stone) && stocks(ID.dirt) && !stocks(ID.gold_ore) && !stocks(ID.leaves), 'digging earth and rock stocks rubble; ore and leaves do not')

// a knocked bot is dazed and does nothing for DAZE seconds
const w2 = new World(42)
const b = new Bot(w2, 1, { skill: 0.9 })
for (let t = 0; t < 10; t += 1 / 30) b.tick(1 / 30)
const y0 = b.pos[1], dug0 = b.broken
b.knock()
let peak = b.pos[1]
for (let t = 0; t < DAZE - 0.1; t += 1 / 30) { b.tick(1 / 30); peak = Math.max(peak, b.pos[1]) }
ok(peak > y0 + 0.5 && b.broken === dug0, `knocked: thrown up (${(peak - y0).toFixed(1)} blocks) and digs nothing for ${DAZE} s`)
for (let t = 0; t < 3; t += 1 / 30) b.tick(1 / 30)
ok(b.broken > dug0, 'then it carries on')

// bots that buy and use bombs still race 2–5 minutes, and do use them
const w3 = new World(42)
let blasts = 0
const bots = [0.95, 0.85, 0.75].map((skill, i) => new Bot(w3, i + 1, { skill, onBlast: () => blasts++ }))
let t = 0
const done = {}
while (t < 600 && !bots.every(x => x.finished)) {
  for (const x of bots) x.tick(1 / 30)
  t += 1 / 30
  bots.forEach((x, i) => { if (x.finished && done[i] === undefined) done[i] = t })
}
console.log('    bombs used:', blasts, ' finish:', Object.values(done).map(v => v.toFixed(0) + 's').join(' '))
ok(blasts > 0, 'bots buy and use bombs in hard rock')
ok(bots.every(x => x.finished) && Math.max(...Object.values(done)) < 300 && Math.min(...Object.values(done)) > 100, 'and the race is still a few minutes')
let lavaGone = 0
for (const [k, v] of w3.edits) if (v === 0 && w3.gen(...k.split(',').map(Number)) === ID.lava) lavaGone++
ok(lavaGone === 0, 'no bomb took any lava')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
