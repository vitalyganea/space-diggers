/* System 20 check in the open game: sell at the Trade Hub, upgrade at the
   Workshop, buy bombs, and it all keeps.   node tests/shops-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-tests'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9406 })
  await p.navigate('http://localhost:5181/?fakeads=1'); await sleep(6500)
  await p.eval(`(() => { const b = document.querySelector('.choose-robot .go'); if (b) b.click() })()`); await sleep(900)   // first start: the default robot, then "Click to play" shows
  await p.tap(640, 360); await sleep(300)
  const O = '__open'
  const click = sel => p.eval(`(() => { const b = document.querySelector('${sel}'); if (!b || b.disabled) return false; b.click(); return true })()`)
  const goIn = async (pos) => { await p.eval(`${O}.noa.entities.setPosition(${O}.noa.playerEntity, ${JSON.stringify(pos)})`); await sleep(500); await p.hold('KeyE', 80); await sleep(400) }
  // the Trade Hub
  await p.eval(`${O}.bag.add('copper', 6); ${O}.bag.add('titanium', 4); ${O}.bag.add('gold', 1)`)
  await goIn([0.5, 1, 7.4])
  const rows = await p.eval(`document.querySelectorAll('.building table.goods tr').length`)
  ok(rows === 3 && /Sell everything · 54/.test(await p.eval(`document.querySelector('[data-act="sellAll"]').textContent`)), `the Trade Hub lists the backpack (3 kinds) and offers 54 for all of it`)
  await p.shot(OUT + '/sh1-market.png')
  ok(await click('[data-act="sell"][data-arg="gold"]'), 'selling just the gold')
  await sleep(300)
  ok((await p.eval(`${O}.digger.coins`)) === 12 && !(await p.eval(`${O}.bag.items.gold`)), '12 coins, no gold left')
  ok(await click('[data-act="sellDouble"]'), 'sell the rest with an ad, for double')
  await sleep(2400)
  ok((await p.eval(`${O}.digger.coins`)) === 12 + 84 && (await p.eval(`${O}.bag.count`)) === 0, `the stand-in ad doubles it: 42 -> 84 (${await p.eval(`${O}.digger.coins`)} coins)`)
  await click('.building .close'); await sleep(300)
  // the Workshop
  await goIn([8.4, 1, 0.5])
  ok(/Workshop/.test(await p.eval(`document.querySelector('.building h1').textContent`)), 'the Workshop opens')
  await p.shot(OUT + '/sh2-workshop.png')
  ok(await click('[data-act="buy"][data-arg="drill"]'), 'upgrade the drill (50)')
  await sleep(300)
  ok(await p.eval(`${O}.gear.drill === 1 && ${O}.digger.speed === 1.3 && ${O}.digger.coins === 46`), 'drill 2: faster, 46 coins left')
  ok(!(await click('[data-act="buy"][data-arg="drill"]')) && (await p.eval(`${O}.gear.drill`)) === 1, 'drill 3 (150) is too dear now')
  await p.eval(`${O}.digger.coins = 500`); await sleep(100)
  await click('.building .close'); await goIn([8.4, 1, 0.5])
  await click('[data-act="buy"][data-arg="battery"]'); await sleep(200)
  await click('[data-act="buy"][data-arg="backpack"]'); await sleep(200)
  await click('[data-act="buy"][data-arg="lamp"]'); await sleep(200)
  ok(await p.eval(`${O}.battery.capacity === 150 && ${O}.battery.charge === 150 && ${O}.bag.capacity === 30 && ${O}.look.lamp.range === 12`), 'battery 150 (and full), backpack 30, lamp 12')
  await click('.building .close'); await sleep(200)
  // the Bomb shop
  await goIn([-8.4, 1, 0.5])
  for (let i = 0; i < 6; i++) { await click('[data-act="bomb"]'); await sleep(120) }
  ok((await p.eval(`${O}.digger.bombs`)) === 5, 'bombs up to the carry limit of 5')
  await click('.building .close')
  // all of it kept
  await p.eval(`${O}.persist()`); await p.reload(); await sleep(6500)
  ok(await p.eval(`${O}.gear.drill === 1 && ${O}.gear.lamp === 1 && ${O}.battery.capacity === 150 && ${O}.bag.capacity === 30 && ${O}.digger.bombs === 5 && ${O}.digger.speed === 1.3`), 'after a reload: the upgrades, and the bombs')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
