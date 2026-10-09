/* System 23 check: tickets home.   node tests/ticket-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9413 })
  await p.navigate('http://localhost:5181/'); await sleep(6500)
  const O = '__open'
  await p.eval(`document.querySelector('.choose-robot .go').click()`); await sleep(900)
  await p.tap(640, 360); await sleep(300)
  const click = sel => p.eval(`(() => { const b = document.querySelector('${sel}'); if (!b || b.disabled) return false; b.click(); return true })()`)
  // buy two at the Bomb shop
  await p.eval(`${O}.digger.coins = 40; ${O}.noa.entities.setPosition(${O}.noa.playerEntity, [-8.4, 1, 0.5])`); await sleep(500)
  await p.hold('KeyE', 80); await sleep(400)
  ok(await click('[data-act="ticket"]') && await click('[data-act="ticket"]'), 'the Bomb shop sells tickets home')
  await sleep(200)
  ok(await p.eval(`${O}.tickets() === 2 && ${O}.digger.coins === 10`), 'two for 30 coins')
  ok(!(await click('[data-act="ticket"]')), 'a third is out of reach at 10 coins')
  await click('.building .close'); await sleep(200)
  ok(await p.eval(`document.querySelector('.hud .tickets b').textContent === '2'`), 'the HUD shows 2 tickets')
  // 20 down, T takes you home
  const deep = async () => {
    await p.eval(`(() => { for (let y = 0; y > -21; y--) ${O}.world.set(30, y, 0, 0); ${O}.noa.entities.setPosition(${O}.noa.playerEntity, [30.5, -20, 0.5]) })()`)
    await sleep(1200)
  }
  await deep()
  await p.tap(640, 360); await sleep(200)
  await p.hold('KeyT', 80); await sleep(800)
  let s = await p.eval(`${O}.state()`)
  ok(Math.abs(s.x - 0.5) < 0.3 && Math.abs(s.z - 0.5) < 0.3 && s.y >= 0.9 && s.y < 2, `T: back in the middle of town (${s.x}, ${s.y}, ${s.z})`)
  ok((await p.eval(`${O}.tickets()`)) === 1, 'one ticket used')
  // stranded with a ticket: the card offers it
  await deep()
  await p.eval(`${O}.battery.charge = 0.1; ${O}.noa.camera.pitch = 1.55`)
  await p.tap(640, 360); await sleep(200); await p.holdUntil(`${O}.card.open`); await sleep(300)
  ok(await click('[data-act="ticket"]'), 'stranded, the card offers the ticket')
  await sleep(800)
  s = await p.eval(`${O}.state()`)
  ok(s.y >= 0.9 && !(await p.eval(`${O}.card.open`)) && (await p.eval(`${O}.tickets()`)) === 0, 'and it takes you home, card gone, no tickets left')
  await p.tap(640, 360); await sleep(200)
  await p.hold('KeyT', 80); await sleep(300)
  ok(/No tickets/.test(await p.eval(`document.querySelector('.hud .toast').textContent`)), 'with none, T says where to buy one')
  await p.eval(`${O}.persist()`)
  ok(JSON.parse(await p.eval(`localStorage.getItem('spacediggers-save-v1')`)).tickets === 0, 'kept in the save')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
