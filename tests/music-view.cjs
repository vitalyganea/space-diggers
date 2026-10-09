/* Row 41 check in the open game: the music.   node tests/music-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9446 })
  await p.navigate('http://localhost:5181/?seed=7')
  await p.waitFor(`!!document.querySelector('.choose-robot .go')`)
  const O = '__open'
  await p.tap(300, 120); await sleep(2500)                          // a click wakes the sound
  ok(await p.eval(`${O}.music.theme === 'menu' && ${O}.music.played > 4`), `while choosing a robot: the menu theme (${await p.eval(`${O}.music.played`)} notes so far)`)
  await p.eval(`document.querySelector('.choose-robot .go').click(); document.querySelector('.comic .skip') && document.querySelector('.comic .skip').click(); document.querySelector('.daily .claim') && document.querySelector('.daily .claim').click(); 1`); await sleep(5500)
  ok(await p.eval(`${O}.music.theme === 'surface'`), 'in the game, on the surface: the surface theme')
  await p.eval(`(() => { for (let y = 0; y > -12; y--) ${O}.world.set(30, y, 0, 0); ${O}.noa.entities.setPosition(${O}.noa.playerEntity, [30.5, -11, 0.5]) })(); 1`)
  ok(await p.waitFor(`${O}.music.theme === 'deep'`, 9000), 'down a shaft: the deep theme, from the next bar')
  const n = await p.eval(`${O}.music.played`)
  await sleep(6500)                                                 // a bar of the deep theme is 4.3 s
  ok((await p.eval(`${O}.music.played`)) > n, 'and it keeps playing')
  await p.tap(640, 360); await sleep(200)
  await p.hold('KeyM', 80); await sleep(300)
  ok(await p.eval(`${O}.sound.muted && ${O}.sound.master.gain.value === 0 && ${O}.music.bus.context === ${O}.sound.ctx`), 'M mutes it with everything else (it plays through the master volume)')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
