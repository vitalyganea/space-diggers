/* Row 38 check in the open game: a meteor falls from the rings.   node tests/meteor-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9444 })
  await p.navigate('http://localhost:5181/?seed=7')
  await p.waitFor(`!!document.querySelector('.choose-robot .go')`)
  await p.eval(`document.querySelector('.choose-robot .go').click(); document.querySelector('.comic .skip') && document.querySelector('.comic .skip').click(); document.querySelector('.daily .claim') && document.querySelector('.daily .claim').click(); 1`); await sleep(1000)
  const O = '__open'
  ok(await p.eval(`${O}.meteors.next >= 170`), 'none in the first minutes of a game')
  await p.eval(`${O}.noa.entities.setPosition(${O}.noa.playerEntity, [50.5, 3, 0.5]); 1`); await sleep(1500)
  await p.eval(`${O}.meteors.drop([75, 0]); 1`)
  ok(await p.waitFor(`${O}.meteors.fall && ${O}.meteors.ball.isEnabled()`, 3000), 'a fireball comes down out of the sky')
  ok(await p.waitFor(`!${O}.meteors.fall`, 10000), 'and strikes')
  await sleep(500)
  const r = await p.eval(`({ marks: ${O}.meteors.marks.length, iron: (() => { let n = 0; for (let x = 72; x <= 78; x++) for (let z = -3; z <= 3; z++) for (let y = 4; y > -8; y--) if (${O}.world.get(x, y, z) === 30) n++; return n })(),
    log: ${O}.sound.log.join(' '), said: ${O}.talk().said.concat(${O}.talk().queue).join('|'), toast: document.querySelector('.hud .toast').textContent })`)
  ok(/whoosh/.test(r.log) && /boom/.test(r.log), 'with a whoosh and a boom')
  ok(r.iron >= 6, `leaving a fresh crater with meteor iron in it (${r.iron})`)
  ok(r.marks === 1 && /on your map/.test(r.toast) && /A meteor fell .*blocks away/.test(r.said), 'marked on the map; the robot calls you over')
  await p.eval(`${O}.noa.entities.setPosition(${O}.noa.playerEntity, [75.5, 4, 0.5]); 1`); await sleep(800)
  ok((await p.eval(`${O}.meteors.marks.length`)) === 0, 'the mark goes once you get there')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
