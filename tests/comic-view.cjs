/* Row 43 check: the comic for a new player.   node tests/comic-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9449 })
  await p.navigate('http://localhost:5181/?seed=7')
  await p.waitFor(`!!document.querySelector('.choose-robot .go')`)
  await p.eval(`document.querySelector('.choose-robot .go').click(); 1`); await sleep(500)
  const title = () => p.eval(`document.querySelector('.comic h1').textContent`)
  ok(/Welcome to the Moon/.test(await title()) && /Bzz:/.test(await p.eval(`document.querySelector('.comic .bubble').textContent`)), 'after choosing a robot, the comic: your robot welcomes you to the Moon')
  ok(await p.eval(`getComputedStyle(document.querySelector('.click-to-play')).display === 'none' && document.body.classList.contains('showcase')`), 'over the circling scene, no "Click to play"')
  const seen = [await title()]
  for (let i = 0; i < 4; i++) { await p.eval(`document.querySelector('.comic .next').click(); 1`); await sleep(150); seen.push(await title()) }
  ok(seen.length === 5 && new Set(seen).size === 5, `five panels: ${seen.join(' / ')}`)
  ok(/hold/.test(await p.eval(`(() => { document.querySelector('.comic .back').click(); document.querySelector('.comic .back').click(); document.querySelector('.comic .back').click(); return document.querySelector('.comic .keys').textContent })()`)), 'Back goes back (the dig panel shows what to hold)')
  for (let i = 0; i < 3; i++) { await p.eval(`document.querySelector('.comic .next').click(); 1`); await sleep(100) }
  const at = await p.eval(`(() => { const b = document.querySelector('.comic .next'); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, b.textContent] })()`)
  ok(at[2] === 'Start digging!', 'the last button: "Start digging!"')
  await p.tap(at[0], at[1]); await sleep(800)
  ok(await p.eval(`!document.querySelector('.comic') && !!document.pointerLockElement && !document.body.classList.contains('showcase')`), 'it starts the game: mouse locked, the camera back in your eyes')
  // coming back: the title offers it again
  await p.eval(`__open.persist(); 1`); await p.reload()
  await p.waitFor(`!!document.querySelector('.title-screen .help')`)
  ok(!(await p.eval(`!!document.querySelector('.comic')`)), 'a returning player gets the title, not the comic')
  await p.eval(`document.querySelector('.title-screen .help').click(); 1`); await sleep(300)
  ok(await p.eval(`!!document.querySelector('.comic')`), '"How to play" shows it again')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
