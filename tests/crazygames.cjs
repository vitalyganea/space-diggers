/* System 13 check: the built CrazyGames copy (bash build-crazygames.sh),
   served as it will be, with the real SDK in its local mode.
   node tests/crazygames.cjs   (serves crazygames/game on :8071 itself) */
const { launch, sleep } = require('../tools/cdp.cjs')
const { spawn } = require('child_process')
const path = require('path')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8071'], { cwd: path.join(__dirname, '..', 'crazygames', 'game'), stdio: 'ignore' })
  await sleep(800)
  const p = await launch({ w: 1280, h: 720, port: 9396 })
  const said = re => p.prints.some(t => re.test(t))
  await p.navigate('http://localhost:8071/?seed=42&limit=8'); await sleep(6000)
  ok(said(/CrazyGames HTML SDK initialized/), 'the CrazyGames SDK starts (local mode)')
  ok(said(/loading ?start/i) && said(/loading ?stop/i), 'loading is reported started and stopped')
  ok(!said(/gameplay start/i), 'no gameplay before the player is in')
  await p.tap(640, 360); await sleep(1200)
  ok(said(/gameplay start/i), 'in the race with the mouse in: gameplay start')
  await p.eval('document.exitPointerLock()'); await sleep(800)
  ok(said(/gameplay stop/i), 'mouse out: gameplay stop')
  ok(await p.eval(`getComputedStyle(document.querySelector('.click-to-play')).display`) === 'flex', 'and "Click to dig" is back')
  await sleep(6000)                                       // the 8 s round times out
  ok(await p.eval(`!!document.querySelector('.results')`), 'the round ends in results')
  const saved = await p.eval(`localStorage.getItem('boomdiggers-save-v1')`)
  ok(saved && JSON.parse(saved).rounds === 1, 'the save is written (mirrored to localStorage)')
  ok(said(/DATA.*[Ss]et|setItem/) || p.prints.some(t => /boomdiggers-save-v1/.test(t)), 'and through the SDK data module')
  const before = await p.eval('location.search')
  await p.eval(`document.querySelector('.results .again').click()`); await sleep(7000)   // the SDK's local test ad runs ~3 s
  ok(said(/\[Boom Diggers\] midgame ad: requested/), 'Play again asks for a midgame ad')
  ok(said(/\[Boom Diggers\] midgame ad: (finished|refused|could not)/), 'and goes on when it is over or refused')
  ok((await p.eval('location.search')) !== before, 'then a new round starts')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  console.log('    SDK lines:', p.prints.filter(t => /gameplay|loading|midgame|requestAd|DATA/i.test(t)).map(t => t.replace(/%c|background-color[^;]*;|border-radius[^;]*;|padding[^;]*;|color: [^ ;]*;?/g, '').replace(/\s+/g, ' ').slice(0, 70)).join(' | '))
  await p.close(); srv.kill()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
