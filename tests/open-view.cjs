/* System 15 check: the open game has no clock, and keeps the world.
   node tests/open-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9399 })
  await p.navigate('http://localhost:5181/'); await sleep(6000)
  await p.eval(`(() => { const b = document.querySelector('.choose-robot .go'); if (b) b.click(); const sk = document.querySelector('.comic .skip'); if (sk) sk.click(); const cl = document.querySelector('.daily .claim'); if (cl) cl.click() })()`); await sleep(900)   // first start: the default robot, then "Click to play" shows
  ok(await p.eval(`!document.querySelector('.hud .timer') && !document.querySelector('.hud .count') && !document.querySelector('.hud .board')`),
     'no countdown, no clock, no race board')
  ok(await p.eval('__open.digger.enabled'), 'you can dig straight away')
  await p.tap(640, 360); await sleep(400)
  // out of town (its square cannot be dug), onto the flat grass east of it
  await p.eval('__open.noa.entities.setPosition(__open.noa.playerEntity, [26.5, 1, 0.5])'); await sleep(1500)
  const start = await p.eval('__open.state()')
  await p.eval('__open.noa.camera.pitch = 1.55'); await sleep(200)
  await p.mouseHold(640, 360, 2600); await sleep(600)
  const dug = await p.eval('__open.state()')
  const x = Math.floor(start.x), z = Math.floor(start.z)
  const holes = await p.eval(`[0, -1, -2].map(y => __open.world.get(${x}, y, ${z}))`)
  ok(dug.y < start.y - 2 && holes.every(v => v === 0), `dug down (y ${start.y} -> ${dug.y})`)
  await p.eval('__open.digger.coins = 123; __open.persist()')
  await p.reload(); await sleep(6500)
  const after = await p.eval(`({ s: __open.state(), holes: [0, -1, -2].map(y => __open.world.get(${x}, y, ${z})), coins: __open.digger.coins, seed: __open.world.seed })`)
  ok(after.holes.every(v => v === 0), 'after a reload the hole is still there')
  ok(Math.abs(after.s.y - dug.y) < 1 && Math.abs(after.s.x - dug.x) < 0.5, `and you are where you left off (y ${after.s.y})`)
  ok(after.coins === 123, 'with your coins')
  ok(await p.eval(`__open.noa.getBlock(${x}, -1, ${z}) === 0`), 'and noa draws the hole too')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
