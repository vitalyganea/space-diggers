/* System 9 check in the game: buying with keys 1 and 2.   node tests/shop-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-tests'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9388 })
  await p.navigate('http://localhost:5181/?seed=42'); await sleep(5500)
  await p.tap(640, 360); await sleep(400)
  const st = () => p.eval('({ c: __game.digger.coins, lv: __game.digger.drillLevel, sp: __game.digger.speed, b: __game.digger.bombs, toast: document.querySelector(".hud .toast").textContent, drill: document.querySelector(".shop .drill").className })')
  let s = await st()
  ok(s.drill.includes('no'), 'with no coins the drill offer is dimmed')
  await p.hold('Digit1', 80); await sleep(200)
  s = await st()
  ok(s.lv === 1 && /Need 15/.test(s.toast), `1 with no coins: nothing bought ("${s.toast}")`)
  await p.eval('__game.digger.coins = 100'); await sleep(300)
  s = await st()
  ok(s.drill.includes('can'), 'with coins it lights up')
  await p.hold('Digit1', 80); await sleep(200)
  s = await st()
  ok(s.lv === 2 && s.sp === 1.3 && s.c === 85 && /Drill Lv2/.test(s.toast), `1 buys drill 2 (coins ${s.c}, speed ${s.sp})`)
  await p.shot(OUT + '/s1-bought.png')
  await p.hold('Digit2', 80); await sleep(200)
  s = await st()
  ok(s.b === 1 && s.c === 65, `2 buys a bomb (bombs ${s.b}, coins ${s.c})`)
  // a faster drill digs faster: grass takes 0.35 s at drill 1, 0.27 at drill 2.
  // Counted in game time (the sum of noa's ticks between the press and the
  // break): headless Chrome on a software GPU draws the full game slowly
  // enough that game time falls behind the wall clock.
  await p.eval(`__game.noa.camera.pitch = 1.55;
    window.__gt = 0; window.__down = -1; window.__broke = -1;
    __game.noa.on('tick', dt => { window.__gt += dt / 1000 });
    window.addEventListener('mousedown', () => { window.__down = window.__gt }, true);
    const ob = __game.digger.onBreak; __game.digger.onBreak = e => { if (window.__broke < 0) window.__broke = window.__gt; ob(e) }`)
  await sleep(200)
  await p.pointer('down', 640, 360); await sleep(1500); await p.pointer('up', 640, 360)
  const took = await p.eval('window.__broke - window.__down')
  ok(took > 0.23 && took < 0.31, `drill 2 breaks grass in ${took.toFixed(3)} s of game time (0.27 expected; drill 1 takes 0.35)`)
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
