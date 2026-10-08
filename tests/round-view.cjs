/* System 8 check, the real game in Chrome: countdown, race, a win, a time-out.
   node tests/round-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-tests'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const text = (p, sel) => p.eval(`(document.querySelector('${sel}') || {}).textContent || ''`)

;(async () => {
  // 1: a round the player wins
  let p = await launch({ w: 1280, h: 720, port: 9385 })
  await p.navigate('http://localhost:5181/?seed=42&speed=2'); await sleep(2200)
  const c = await text(p, '.hud .count')
  ok(['1', '2', '3'].includes(c.trim()), `the round opens with a countdown (${c})`)
  ok(!(await p.eval('__game.digger.enabled')), 'nobody can dig during it')
  await p.shot(OUT + '/r1-countdown.png')
  await sleep(2500)
  ok((await p.eval('__game.round.phase')) === 'race' && (await p.eval('__game.digger.enabled')), 'then the race: digging allowed')
  const ctp = await p.eval(`getComputedStyle(document.querySelector('.click-to-play')).display`)
  ok(ctp === 'flex', 'with the mouse not locked, "Click to dig" shows')
  await p.tap(640, 360); await sleep(500)
  ok(await p.eval(`getComputedStyle(document.querySelector('.click-to-play')).display`) === 'none', 'a click locks the mouse and it goes')
  ok(await p.eval('__game.noa.container.hasPointerLock'), 'and noa counts it as locked, so the mouse turns the view')
  const h0 = await p.eval('__game.noa.camera.heading')
  await p.pointer('move', 640, 360); await p.pointer('move', 760, 360); await sleep(400)
  ok(Math.abs((await p.eval('__game.noa.camera.heading')) - h0) > 0.05, 'moving the mouse after "Click to dig" turns the view')
  await sleep(4000)
  const rows = await p.eval(`[...document.querySelectorAll('.hud .board .row')].map(r => r.textContent.replace(/\\s+/g, ' ').trim())`)
  ok(rows.length === 6 && rows.some(r => r.includes('You')), `six on the leaderboard (${rows.join(' | ')})`)
  await p.shot(OUT + '/r2-race.png')
  await p.eval('__game.toCore()'); await sleep(1500)
  const res = await text(p, '.results h1')
  ok(/You win!/.test(res), `standing on the Core first wins (${res})`)
  ok((await p.eval('__game.round.phase')) === 'over' && !(await p.eval('__game.digger.enabled')), 'the round is over and digging stops')
  await p.shot(OUT + '/r3-win.png')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()

  // 2: the clock runs out
  p = await launch({ w: 1280, h: 720, port: 9386 })
  await p.navigate('http://localhost:5181/?seed=7&speed=3&limit=12'); await sleep(17500)
  const h1 = await text(p, '.results h1'), h2 = await text(p, '.results h2')
  ok(/place/.test(h1) && /Time up/.test(h2), `time up: results by depth (${h1} / ${h2})`)
  const order = await p.eval(`__game.round.standings().map(s => s.depth)`)
  ok(order.every((d, i) => i === 0 || d <= order[i - 1]), `deepest first (${order.join(' ')})`)
  await p.shot(OUT + '/r4-timeup.png')
  const before = await p.eval('location.search')
  await p.eval(`document.querySelector('.results .again').click()`); await sleep(2500)
  const after = await p.eval('location.search')
  ok(after !== before && /seed=/.test(after), `Play again starts a new round on a new world (${before} -> ${after})`)
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
