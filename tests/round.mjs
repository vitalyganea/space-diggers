/* System 8 check: the round's logic, headless.   node tests/round.mjs */
import { Round, COUNTDOWN } from '../src/round.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const mk = (name, extra = {}) => ({ name, d: 0, done: false, depth() { return this.d }, finished() { return this.done }, ...extra })
let A = mk('You', { isPlayer: true }), B = mk('Mo'), C = mk('Bev')
let r = new Round([A, B, C], { limit: 60 })
const seen = []; r.onPhase = p => seen.push(p)
r.tick(1); ok(r.phase === 'countdown' && r.countdown === 2, `counts down (${r.countdown})`)
r.tick(COUNTDOWN); ok(r.phase === 'race' && seen[0] === 'race', 'then the race starts')
r.racers[1].d = 40; r.racers[2].d = 20; r.racers[0].d = 30
let s = r.standings()
ok(s.map(x => x.name).join() === 'Mo,You,Bev', `standings by depth (${s.map(x => x.name + ' ' + x.depth).join(', ')})`)
r.racers[2].done = true; r.tick(5)
ok(r.phase === 'over' && seen.at(-1) === 'over', 'the first to reach the Core ends the round')
ok(r.winner().name === 'Bev', 'and wins it')
ok(r.standings().map(x => x.name).join() === 'Bev,You,Mo' || r.standings().map(x => x.name).join() === 'Bev,Mo,You',
   `the rest by depth (${r.standings().map(x => x.name + ' ' + x.depth).join(', ')})`)
ok(r.standings().map(x => x.name).join() === 'Bev,Mo,You', 'deepest next: Mo 40, then You 30')
r.racers[0].done = true; r.tick(5)
ok(r.racers[0].finishedAt === null, 'nothing changes once it is over')
// time out
A = mk('You', { isPlayer: true }); B = mk('Mo')
r = new Round([A, B], { limit: 10 })
r.tick(COUNTDOWN + 5); ok(r.phase === 'race' && Math.round(r.timeLeft) === 5, `clock runs (${r.timeLeft.toFixed(1)} s left)`)
r.racers[0].d = 50; r.racers[1].d = 60
r.tick(6); ok(r.phase === 'over' && r.winner() === null && r.standings()[0].name === 'Mo', 'clock out: over, nobody wins, deepest first')
ok(Math.abs(r.standings()[0].progress - 60 / 99) < 1e-9, 'progress is depth over the way to the Core')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
