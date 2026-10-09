/* System 10 check in the game: Q throws a bomb, the right button places
   rubble, blasts daze whoever is near.   node tests/bombs-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-tests'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9392 })
  await p.navigate('http://localhost:5181/?mode=race&seed=42'); await sleep(5500)
  await p.tap(640, 360); await sleep(400)
  const G = '__game'
  // count the World's changed blocks to see a crater appear
  const air = () => p.eval(`[...${G}.world.edits.values()].filter(v => v === 0).length`)

  // Q with no bombs: refused
  await p.hold('KeyQ', 80); await sleep(200)
  ok(/No bombs/.test(await p.eval('document.querySelector(".hud .toast").textContent')), 'Q with no bombs says so')

  // a bomb thrown up and away lands far off and blows a crater there
  await p.eval(`${G}.digger.bombs = 1; ${G}.noa.camera.heading = Math.PI / 2; ${G}.noa.camera.pitch = -0.35`); await sleep(300)
  const a0 = await air(), c0 = await p.eval(`${G}.digger.coins`)
  await p.hold('KeyQ', 80); await sleep(300)
  ok((await p.eval(`${G}.digger.bombs`)) === 0 && (await p.eval(`${G}.bombs.live.length`)) === 1, 'Q throws it: one bomb in the air')
  await sleep(900); await p.shot(OUT + '/b1-flying.png')
  await sleep(1400)
  const a1 = await air()
  await p.shot(OUT + '/b2-boom.png')
  ok(a1 - a0 > 25, `after the 2 s fuse it blows a crater (${a1 - a0} blocks)`)
  ok(!(await p.eval(`${G}.dazed()`) > 0), 'far enough away, the thrower is not dazed')

  // a bomb at your own feet throws you up and dazes you for 2 s
  await p.eval(`${G}.digger.bombs = 1; ${G}.noa.camera.pitch = 1.5`); await sleep(200)
  await p.hold('KeyQ', 80); await sleep(2300)
  const dz = await p.eval(`${G}.dazed()`)
  ok(dz > 0.5 && !(await p.eval(`${G}.digger.enabled`)), `a bomb at your feet dazes you (${dz.toFixed(1)} s left, no digging)`)
  await sleep(2200)
  ok(await p.eval(`${G}.digger.enabled`), 'and then you dig again')

  // a blast beside a bot knocks it
  const knock = await p.eval(`(() => { const b = ${G}.bots[0]; ${G}.bombs.explode([b.pos[0] + 1, b.pos[1] + 1, b.pos[2]], 'you'); return b.dazed })()`)
  ok(knock > 1.5, `a blast next to a bot dazes it (${knock.toFixed(1)} s)`)

  // the right button places rubble from your stock, not inside yourself
  await sleep(2500)
  await p.eval(`${G}.digger.stock = 3; ${G}.noa.camera.pitch = 1.55`); await sleep(300)
  await p.mouseHold(640, 360, 80, 'right'); await sleep(300)
  ok((await p.eval(`${G}.digger.stock`)) === 3, 'no block placed where you stand')
  await p.eval(`${G}.noa.camera.pitch = 0.75`); await sleep(400)
  const t = await p.eval(`${G}.noa.targetedBlock && [...${G}.noa.targetedBlock.adjacent]`)
  await p.mouseHold(640, 360, 80, 'right'); await sleep(300)
  const placed = t && await p.eval(`${G}.world.get(${t.join(',')})`)
  ok(placed === 15 && (await p.eval(`${G}.digger.stock`)) === 2, `the right button puts a block of rubble at ${t} (stock 3 -> 2)`)
  await p.shot(OUT + '/b3-placed.png')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
