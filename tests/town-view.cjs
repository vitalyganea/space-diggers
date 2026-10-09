/* System 19 check in the open game: the town, its doors and E.
   node tests/town-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9405 })
  await p.navigate('http://localhost:5181/'); await sleep(6500)
  await p.eval(`(() => { const b = document.querySelector('.choose-robot .go'); if (b) b.click(); const sk = document.querySelector('.comic .skip'); if (sk) sk.click() })()`); await sleep(900)   // first start: the default robot, then "Click to play" shows
  await p.tap(640, 360); await sleep(300)
  const O = '__open'
  const promptText = () => p.eval(`getComputedStyle(document.querySelector('.door-prompt')).display === 'none' ? '' : document.querySelector('.door-prompt b').textContent`)
  ok((await promptText()) === '', 'in the middle of the square: no prompt')
  ok(await p.eval(`${O}.world.get(0, 0, 0) === 28 && ${O}.noa.getBlock(0, 7, 12) === 19`), 'the charging pad, and the Trade Hub\'s glass dome, drawn')
  await p.eval(`${O}.noa.entities.setPosition(${O}.noa.playerEntity, [0.5, 1, 11.4]); ${O}.noa.camera.heading = 0`); await sleep(500)
  ok((await promptText()) === 'Talk to Rita', 'at the Trade Hub\'s counter: "[E] Talk to Rita" (row 46)')
  await p.hold('KeyE', 80); await sleep(400)
  ok(await p.eval(`!!document.querySelector('.building') && document.querySelector('.building h1').textContent === 'Trade Hub'`), 'E opens it')
  ok(!(await p.eval('!!document.pointerLockElement')), 'with the mouse free')
  // a real click on Close goes straight back into the game (it used to ask for another click)
  const at = await p.eval(`(() => { const r = document.querySelector('.building .close').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] })()`)
  await p.tap(at[0], at[1]); await sleep(500)
  ok(await p.eval(`!document.querySelector('.building') && !!document.pointerLockElement && getComputedStyle(document.querySelector('.click-to-play')).display === 'none'`), 'Close: straight back in the game, no "Click to play"')
  ok(!(await p.eval(`!!document.querySelector('.building')`)), 'Close shuts it')
  await p.eval(`${O}.noa.entities.setPosition(${O}.noa.playerEntity, [0.5, 1, -10.4])`); await sleep(500)
  ok((await promptText()) === 'Talk to Hoot', 'at the Museum\'s counter, its keeper Hoot (the museum itself opens with stage 2)')
  // E no longer places a block; the right button still does
  await p.tap(640, 360); await sleep(300)
  // out of town on open grass: stand on the ground there, look a little down
  await p.eval(`(() => { let y = 12; while (${O}.world.get(30, y - 1, 2) === 0) y--
    ${O}.digger.stock = 5; ${O}.noa.entities.setPosition(${O}.noa.playerEntity, [30.5, y, 2.5]); ${O}.noa.camera.heading = 0; ${O}.noa.camera.pitch = 0.7 })()`); await sleep(1500)
  console.log('    aiming at', JSON.stringify(await p.eval(`${O}.noa.targetedBlock && [...${O}.noa.targetedBlock.position]`)))
  await p.hold('KeyE', 80); await sleep(300)
  ok((await p.eval(`${O}.digger.stock`)) === 5, 'E places nothing')
  await p.mouseHold(640, 360, 80, 'right'); await sleep(300)
  ok((await p.eval(`${O}.digger.stock`)) === 4, 'the right button still places rubble')
  // the town cannot be dug
  // aim beside the doorway, at the front wall (looking through the door reaches the far wall, out of reach)
  await p.eval(`${O}.noa.entities.setPosition(${O}.noa.playerEntity, [2.5, 1, 7.4]); ${O}.noa.camera.heading = 0; ${O}.noa.camera.pitch = 0.2`); await sleep(800)
  const t = await p.eval(`${O}.noa.targetedBlock && [...${O}.noa.targetedBlock.position]`)
  await p.mouseHold(640, 360, 2500); await sleep(300)
  ok(t && (await p.eval(`${O}.world.get(${t.join(',')})`)) !== 0, `the Trade Hub's wall cannot be dug (${t})`)
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
