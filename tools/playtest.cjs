/* playtest.cjs: a whole round of the real game, played through the mouse
   and keyboard only, against the five bots, then the results, the animal
   shop and Play again. Slow (a real round): not part of tests/run.sh.

     npm run dev -- --port 5181 &   then   node tools/playtest.cjs [seed]

   The player here does what a person does: looks down and holds the
   button to dig; presses 1 whenever a better drill is affordable; when lava
   is under its feet it turns, digs out the block at head height and the
   one at its feet, walks into the gap and looks down again. It reads the
   world through window.__game only to decide; every action is an input. */
const { launch, sleep } = require('./cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-playtest'
const seed = +process.argv[2] || 42
const LAVA = 6, CORE = 12
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }

;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9398 })
  await p.navigate(`http://localhost:5181/?seed=${seed}`); await sleep(5000)
  await p.tap(640, 360); await sleep(4000)                     // into the game; the countdown runs out
  const G = '__game'
  const look = (heading, pitch) => p.eval(`${G}.noa.camera.heading = ${heading}; ${G}.noa.camera.pitch = ${pitch}`)
  const state = () => p.eval(`(() => { const g = ${G}, pos = g.noa.entities.getPosition(g.noa.playerEntity)
    const c = [Math.floor(pos[0]), Math.floor(pos[1] + 1e-6), Math.floor(pos[2])]
    return { pos: pos.map(v => +v.toFixed(2)), c, below: g.world.get(c[0], c[1] - 1, c[2]), phase: g.round.phase,
      coins: g.digger.coins, drill: g.digger.drillLevel, dazed: g.dazed(),
      around: [[1,0],[0,1],[-1,0],[0,-1]].map(([dx, dz]) => [g.world.get(c[0] + dx, c[1], c[2] + dz), g.world.get(c[0] + dx, c[1] + 1, c[2] + dz), g.world.get(c[0] + dx, c[1] - 1, c[2] + dz)]),
      time: +g.round.raceTime.toFixed(1), board: g.round.standings().map(s => s.name + ' ' + (s.finishedAt !== null ? 'CORE' : s.depth)).join(', ') } })()`)
  const HEAD = [Math.PI / 2, 0, 3 * Math.PI / 2, Math.PI]      // headings for +x, +z, -x, -z
  let down = false, shots = 0, lastLog = 0, dir = 0
  const press = async on => { if (on !== down) { down = on; await p.pointer(on ? 'down' : 'up', 640, 360) } }

  for (let k = 0; k < 6000; k++) {
    const s = await state()
    if (s.phase !== 'race') break
    if (s.time - lastLog >= 30) { lastLog = s.time; console.log(`    ${s.time}s  depth ${-s.c[1]}  drill ${s.drill}  coins ${s.coins}  |  ${s.board}`) }
    if (s.time > 40 * (shots + 1) && shots < 4) { shots++; await p.shot(`${OUT}/p${shots}.png`) }
    const next = [15, 40, 80][s.drill - 1]
    if (next && s.coins >= next) { await press(false); await p.hold('Digit1', 60) }
    if (s.dazed > 0) { await press(false); await sleep(200); continue }
    if (s.below !== LAVA) { await look(HEAD[dir], 1.55); await press(true); await sleep(120); continue }
    // lava below: tunnel sideways, turning away from lava on that side
    await press(false)
    let tries = 0
    while ((s.around[dir][0] === LAVA || s.around[dir][1] === LAVA) && tries++ < 4) dir = (dir + 1) % 4
    const [feet, head] = s.around[dir]
    if (head) { await look(HEAD[dir], -0.15); await press(true); await sleep(150); continue }
    if (feet) { await look(HEAD[dir], 0.75); await press(true); await sleep(150); continue }
    await look(HEAD[dir], 0.3)
    await p.hold('KeyW', 260)
  }
  await press(false)
  const end = await p.eval(`({ phase: ${G}.round.phase, s: ${G}.round.standings(), t: ${G}.round.raceTime })`)
  const me = end.s.find(x => x.isPlayer)
  console.log(`    over after ${end.t.toFixed(0)} s of race: ` + end.s.map(x => `${x.place}. ${x.name} ${x.finishedAt !== null ? 'Core ' + x.finishedAt.toFixed(0) + 's' : x.depth + 'm'}`).join(', '))
  ok(end.phase === 'over', 'the round ends')
  ok(end.s.some(x => x.finishedAt !== null), 'someone reaches the Core')
  ok(me.depth >= 60, `the player, on real inputs, gets deep (${me.depth} m, ${me.place}${['st', 'nd', 'rd'][me.place - 1] || 'th'})`)
  await p.shot(`${OUT}/p-results.png`)
  const pay = await p.eval(`document.querySelector('.results .pay') && document.querySelector('.results .pay').textContent.replace(/\\s+/g, ' ').trim()`)
  ok(!!pay, `the results card pays out (${pay})`)
  await p.eval(`document.querySelector('.results .animals').click()`); await sleep(400)
  ok(await p.eval(`document.querySelectorAll('.animals-shop .animal').length === 3`), 'the animal shop opens from it')
  await p.shot(`${OUT}/p-shop.png`)
  await p.eval(`document.querySelector('.animals-shop .close').click()`); await sleep(300)
  await p.eval(`document.querySelector('.results .again').click()`); await sleep(6000)
  ok(await p.eval(`${G}.round.phase !== 'over' && ${G}.save.rounds === 1`), 'Play again starts the next round with the save carried over')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
