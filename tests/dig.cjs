/* System 4 check: digging in ?dev=dig, real mouse in headless Chrome.
   node tests/dig.cjs  (vite dev on :5181) */
const { launch, sleep } = require('../tools/cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-tests'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }

;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9377 })
  await p.navigate('http://localhost:5181/?dev=dig')
  await sleep(6000)
  const D = 'window.__dev'
  await p.tap(640, 360); await sleep(400)          // lock the mouse first

  // straight down onto the grass under his feet
  await p.eval(`${D}.aim(0.5, 0.5, 1.55)`); await sleep(300)
  let t = await p.eval(`${D}.target()`)
  ok(t && t.pos.join() === '0,0,0' && t.id === 1, `aims at the grass underfoot (${JSON.stringify(t)})`)
  await p.mouseHold(640, 360, 200); await sleep(100)
  ok(await p.eval(`${D}.block(0,0,0)`) === 1, 'a 0.2 s press does not break grass (needs 0.35 s)')
  const t0 = await p.eval('performance.now()')
  await p.pointer('down', 640, 360); await sleep(150)
  await p.shot(OUT + '/d1-cracking.png')
  await sleep(2850); await p.pointer('up', 640, 360); await sleep(300)
  const log = await p.eval(`${D}.log`)
  const first = log[0]
  ok(first && first.name === 'grass', `the grass breaks (${first && first.name})`)
  const took = first ? (first.t - t0) / 1000 : -1
  ok(took > 0.3 && took < 0.55, `in about its 0.35 s (took ${took.toFixed(2)} s)`)
  const s = await p.eval(`${D}.state()`)
  ok(log.length >= 5 && s.y <= -3, `holding on digs straight down: ${log.length} blocks, now at y ${s.y} (${log.map(l => l.name).join(' ')})`)
  ok(log.slice(0, 3).every(l => l.coins === 0), 'grass and dirt pay nothing')

  // ores in the row at z = 3
  const coinsBefore = await p.eval(`${D}.digger.coins`)
  const want = [['coal_ore', -2, 2, 1.4], ['iron_ore', -1, 5, 1.5], ['gold_ore', 0, 12, 1.8]]
  let paid = coinsBefore
  for (const [name, x, coins, secs] of want) {
    await p.eval(`${D}.aim(${x + 0.5}, 1.5, 0.55)`); await sleep(300)
    t = await p.eval(`${D}.target()`)
    if (!t || t.pos.join() !== `${x},1,3`) { ok(false, `aim at ${name} (${JSON.stringify(t)})`); continue }
    await p.mouseHold(640, 360, secs * 1000); await sleep(300)
    const now = await p.eval(`${D}.digger.coins`)
    ok(await p.eval(`${D}.block(${x},1,3)`) === 0 && now === paid + coins, `${name} breaks and pays ${coins} (coins ${paid} -> ${now})`)
    paid = now
  }

  for (const [name, x] of [['lava', 1], ['core', 2]]) {
    await p.eval(`${D}.aim(${x + 0.5}, 1.5, 0.55)`); await sleep(300)
    const id = await p.eval(`${D}.block(${x},1,3)`)
    await p.mouseHold(640, 360, 2500); await sleep(200)
    ok(await p.eval(`${D}.block(${x},1,3)`) === id && id > 0, `${name} cannot be dug (2.5 s held)`)
  }

  // the crack shell while a stone block is half dug (stone takes 0.8 s)
  await p.eval(`${D}.aim(4.5, 0.5, 1.55)`); await sleep(200)
  await p.mouseHold(640, 360, 360); await sleep(50)          // through the grass
  await p.eval(`${D}.aim(4.5, 0.5, 1.55, 0)`); await sleep(400)
  t = await p.eval(`${D}.target()`)
  await p.pointer('down', 640, 360); await sleep(500)
  const shell = await p.eval(`[${D}.digger.shell.isEnabled(), ${D}.digger.shell.material && ${D}.digger.shell.material.name, ${D}.digger.progress]`)
  await p.shot(OUT + '/d2-cracks.png')
  await p.pointer('up', 640, 360); await sleep(200)
  ok(shell[0] && /^crack[1-4]$/.test(shell[1]), `a half-dug block wears cracks (${JSON.stringify(shell)}, under ${JSON.stringify(t)})`)
  ok(!(await p.eval(`${D}.digger.shell.isEnabled()`)), 'and they go when the button is let go')

  // letting go starts the block over
  await p.eval(`${D}.aim(-1.5, 1.5, 1.55)`); await sleep(300)   // grass at (-2,0,1)
  t = await p.eval(`${D}.target()`)
  await p.mouseHold(640, 360, 220); await sleep(150); await p.mouseHold(640, 360, 220); await sleep(200)
  ok(await p.eval(`${D}.block(${t.pos.join(',')})`) === t.id, 'two 0.22 s presses do not add up to one 0.35 s dig')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok')
  process.exit(fails ? 1 : 0)
})()
