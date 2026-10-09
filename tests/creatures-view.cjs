/* Row 44 check in the open game: bats, the rock worm, the rock pup.   node tests/creatures-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-tests'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9450 })
  await p.navigate('http://localhost:5181/?seed=7')
  await p.waitFor(`!!document.querySelector('.choose-robot .go')`)
  await p.eval(`document.querySelector('.choose-robot .go').click(); document.querySelector('.comic .skip') && document.querySelector('.comic .skip').click(); 1`); await sleep(800)
  const O = '__open', C = `${O}.creatures`
  // a cave room, 40 down, 9 wide, to have them in
  await p.eval(`(() => { for (let x = 26; x < 36; x++) for (let z = -4; z < 6; z++) { for (let y = -41; y < -36; y++) ${O}.world.set(x, y, z, 0); ${O}.world.set(x, -42, z, 4) }   // with a solid floor (there are caves below)
    ${O}.noa.entities.setPosition(${O}.noa.playerEntity, [30.5, -41, 0.5]); ${O}.noa.camera.heading = 0; ${O}.noa.camera.pitch = 0; ${O}.digger.coins = 5; ${C}.wormIn = 999 })(); 1`)
  await sleep(1500)
  // a bat behind you: it gets to you and pinches a coin
  await p.eval(`${C}.spawnBat([30.5, -39.5, -3.5]); 1`)
  ok(await p.waitFor(`${C}.stolen === 1`, 8000) && (await p.eval(`${O}.digger.coins`)) === 4, 'a bat from behind reaches you and pinches one coin')
  // a bat in front of you: looked at, it flees
  await p.eval(`${C}.spawnBat([30.5, -39.6, 5]); 1`)
  ok(await p.waitFor(`${C}.scared >= 1`, 3000) && (await p.eval(`${O}.digger.coins`)) === 4, 'one you look at flees, and takes nothing')
  await p.shot(OUT + '/cr1-bat.png')
  // the rock worm: it bores a tunnel past you and bumps you aside
  await p.eval(`${O}.noa.entities.setPosition(${O}.noa.playerEntity, [30.5, -41, 0.5]); 1`); await sleep(500)
  const solid0 = await p.eval(`(() => { let n = 0; for (let x = 20; x < 42; x++) for (let z = -12; z < 12; z++) if (${O}.world.get(x, -41, z) !== 0) n++; return n })()`)
  await p.eval(`${C}.spawnWorm(${O}.noa.entities.getPosition(${O}.noa.playerEntity)); 1`)
  await sleep(2500); await p.shot(OUT + '/cr2-worm.png')
  ok(await p.waitFor(`!${C}.worm`, 15000), 'the rock worm passes and goes')
  const solid1 = await p.eval(`(() => { let n = 0; for (let x = 20; x < 42; x++) for (let z = -12; z < 12; z++) if (${O}.world.get(x, -41, z) !== 0) n++; return n })()`)
  ok(solid1 < solid0 - 10, `leaving a tunnel through the rock (${solid0 - solid1} blocks bored at your level)`)
  ok((await p.eval(`${C}.bumps`)) <= 1, `at most a bump, no harm (${await p.eval(`${C}.bumps`)} bump)`)
  // a bomb sends it away
  await p.eval(`${C}.spawnWorm(${O}.noa.entities.getPosition(${O}.noa.playerEntity)); ${C}.scareWorm(); 1`)
  ok(await p.waitFor(`!${C}.worm`, 4000), 'a bomb near it sends it off at once')
  // the rock pup: feed it a shard with E, it brings a gift
  await p.eval(`${O}.noa.entities.setPosition(${O}.noa.playerEntity, [30.5, -41, 0.5]); ${O}.noa.camera.heading = 0; ${C}.spawnPup([30.5, -41, 2.5]); ${O}.bag.add('shard', 1); 1`); await sleep(500)
  await p.tap(640, 360); await sleep(200)
  const before = await p.eval(`${O}.bag.count`)
  await p.hold('KeyE', 80); await sleep(300)
  ok(await p.eval(`!${O}.bag.items.shard && ${C}.fed === 1`), 'E by the rock pup feeds it the crystal shard')
  await p.shot(OUT + '/cr3-pup.png')
  ok(await p.waitFor(`${O}.bag.count === ${before}`, 6000) && await p.eval(`['gold', 'helium', 'stargem'].some(k => ${O}.bag.items[k])`), 'and it digs up a gift for you')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
