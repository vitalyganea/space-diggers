/* Row 40 check in the open game: the laser.   node tests/tools-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-tests'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9445 })
  await p.navigate('http://localhost:5181/?seed=7')
  await p.waitFor(`!!document.querySelector('.choose-robot .go')`)
  await p.eval(`document.querySelector('.choose-robot .go').click(); document.querySelector('.comic .skip') && document.querySelector('.comic .skip').click(); 1`); await sleep(1000)
  const O = '__open'
  const chip = () => p.eval(`document.querySelector('.tool-chip').textContent.replace(/\\s+/g, ' ').trim()`)
  ok(/Drill/.test(await chip()) && !/Laser/.test(await chip()), `the HUD shows the drill in hand ("${await chip()}")`)
  // buy one at the Workshop
  await p.eval(`${O}.digger.coins = 200; ${O}.noa.entities.setPosition(${O}.noa.playerEntity, [11.4, 1, 0.5]); 1`); await sleep(600)
  await p.hold('KeyE', 80); await sleep(400)
  ok(/Cuts black meteorite rock/.test(await p.eval(`document.querySelector('.building').textContent`)), 'the Workshop offers a laser, and says what it is for')
  await p.eval(`document.querySelector('[data-act="buy"][data-arg="laser"]').click(); 1`); await sleep(300)
  ok(await p.eval(`${O}.gear.laser === 1 && ${O}.digger.coins === 80`), 'bought for 120')
  await p.eval(`document.querySelector('.building .close').click(); 1`); await sleep(300)
  ok(/1 Drill.*2 Laser/.test(await chip()), `now the HUD shows both, 1 and 2 ("${await chip()}")`)
  // at the meteorite crater (31, 44 in world 7): aim at its black rock
  const spot = await p.eval(`(() => { const w = ${O}.world; for (let r = 0; r < 6; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) for (let y = 4; y > -8; y--) {
      const x = 31 + dx, z = 44 + dz, id = w.get(x, y, z); if (id === 29 && w.get(x, y + 1, z) === 0 && w.get(x, y + 2, z) === 0) return [x, y, z] } return null })()`)
  await p.eval(`${O}.noa.entities.setPosition(${O}.noa.playerEntity, [${spot[0]} + 0.5, ${spot[1]} + 1, ${spot[2]} + 0.5]); ${O}.noa.camera.pitch = 1.5707; 1`); await sleep(1500)
  await p.tap(640, 360); await sleep(300)
  const t0 = Date.now()
  await p.pointer('down', 640, 360); await sleep(400)
  ok(await p.eval(`${O}.look.hand.tool === 'laser' && ${O}.look.hand.beam.isEnabled()`), 'aimed at meteorite, the laser comes to hand by itself, its beam on')
  await p.shot(OUT + '/tool-laser.png')
  ok(await p.waitFor(`${O}.world.get(${spot.join(',')}) !== 29`, 8000), `and cuts the block (${((Date.now() - t0) / 1000).toFixed(1)} s on this machine)`)
  await p.pointer('up', 640, 360)
  // ordinary rock: back to the drill
  await p.eval(`${O}.noa.entities.setPosition(${O}.noa.playerEntity, [40.5, 3, 0.5]); 1`); await sleep(1500)
  await p.eval(`${O}.noa.camera.pitch = 1.5707; 1`); await sleep(500)
  ok(await p.eval(`${O}.look.hand.tool === 'drill'`), 'aimed at ordinary ground, the drill comes back')
  await p.hold('Digit2', 80); await sleep(200)
  ok(await p.eval(`${O}.look.hand.tool === 'laser'`), '2 takes the laser by hand')
  await p.hold('Digit1', 80); await sleep(200)
  ok(await p.eval(`${O}.look.hand.tool === 'drill'`), '1 the drill')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
