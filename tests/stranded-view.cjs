/* System 18 check in the open game: stranded 30 m down, every way out.
   ?fakeads=1 stands in for a rewarded ad. The robot's trip and the free
   rescue are fast-forwarded (their timing is in tests/stranded.mjs).
   node tests/stranded-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-tests'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9403 })
  await p.navigate('http://localhost:5181/?fakeads=1')
  await p.waitFor(`!!document.querySelector('.choose-robot .go')`)
  await p.eval(`(() => { const b = document.querySelector('.choose-robot .go'); if (b) b.click() })()`); await sleep(900)   // first start: the default robot, then "Click to play" shows
  await p.tap(640, 360); await sleep(300)
  const O = '__open'
  const click = sel => p.eval(`(() => { const b = document.querySelector('${sel}'); if (!b || b.disabled) return false; b.click(); return true })()`)
  const strand = async () => {
    await p.eval(`(() => { const s = ${O}.state(), x = Math.floor(s.x), z = Math.floor(s.z)
      for (let y = 0; y > -30; y--) ${O}.world.set(x, y, z, 0)
      ${O}.noa.entities.setPosition(${O}.noa.playerEntity, [x + 0.5, -29, z + 0.5]); ${O}.battery.charge = 0.3; ${O}.noa.camera.pitch = 1.55 })()`)
    await sleep(1500)
    await p.tap(640, 360); await sleep(200)
    await p.holdUntil(`${O}.card.open`); await sleep(300)
  }
  await strand()
  ok(await p.eval(`${O}.card.open && ${O}.battery.flat`), 'flat 30 m down: the "Battery flat!" card opens')
  ok(!(await p.eval('!!document.pointerLockElement')), 'and frees the mouse to click it')
  await p.shot(OUT + '/st1-card.png')
  await p.eval(`${O}.digger.coins = 5`); await sleep(400)
  ok(!(await click('[data-act="pay"]')), 'too poor to pay: the recharge button is off')
  await p.eval(`${O}.digger.coins = 100`); await sleep(400)
  const cost = await p.eval(`10 + Math.floor(${O}.depth() / 2)`)
  ok(await click('[data-act="pay"]'), `with 100 coins it pays (${cost})`)
  await sleep(300)
  ok(await p.eval(`!${O}.card.open && ${O}.battery.fraction === 1 && ${O}.digger.coins === ${100 - cost}`), 'full battery, card gone, coins taken')

  // the robot sells the gold
  await p.eval(`${O}.digger.coins = 0; ${O}.bag.add('gold')`)
  await strand()
  await click('[data-act="pick"]'); await sleep(300)
  ok(await click('[data-act="robot"][data-arg="gold"]'), 'the robot is sent with the gold')
  await sleep(400)
  ok(/selling Moon gold/.test(await p.eval(`document.querySelector('.stranded .wait').textContent`)) && !(await p.eval(`${O}.bag.items.gold`)), 'the card counts down its trip; the gold has left the backpack')
  await p.shot(OUT + '/st2-robot.png')
  await p.eval(`${O}.rescue.t += 60`); await sleep(500)
  ok((await p.eval(`${O}.digger.coins`)) === 12, 'back with 12 coins')
  ok(!(await click('[data-act="pay"]')), 'still short of the recharge: it stays off')

  // the ad
  ok(await click('[data-act="ad"]'), 'the rewarded ad is offered (here, the stand-in)')
  await sleep(2400)
  ok(await p.eval(`!${O}.card.open && ${O}.battery.fraction === 1`), 'watched: a full recharge')

  // the free drone
  await strand()
  ok(await click('[data-act="free"]'), 'the free rescue drone is always there')
  await p.eval(`${O}.rescue.t += 100`); await sleep(500)
  ok(await p.eval(`!${O}.card.open && Math.abs(${O}.battery.fraction - 0.3) < 0.02`), 'it comes and gives 30%')

  // close, look around, try to dig: the card comes back
  await strand()
  await click('[data-act="close"]'); await sleep(300)
  ok(!(await p.eval(`${O}.card.open`)), 'Close puts the card away')
  await p.tap(640, 360); await sleep(300); await p.mouseHold(640, 360, 300); await sleep(400)
  ok(await p.eval(`${O}.card.open`), 'trying to dig brings it back')
  await click('[data-act="close"]')

  // at the surface the sun charges you, and there is no card
  await p.eval(`(() => { const s = ${O}.state(); ${O}.noa.entities.setPosition(${O}.noa.playerEntity, [s.x + 3, 1, s.z]); ${O}.battery.charge = 0 })()`)
  await sleep(2500)
  const sun = await p.eval(`${O}.battery.charge`)
  ok(sun > 2 && !(await p.eval(`${O}.card.open`)), `in the sun it charges (${sun.toFixed(1)} after a moment) with no card`)
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
