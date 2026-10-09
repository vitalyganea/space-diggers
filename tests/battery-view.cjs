/* System 17 check in the open game: digging drains the battery, it warns,
   flat it stops the drill, and Space against a wall climbs.
   node tests/battery-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9402 })
  await p.navigate('http://localhost:5181/'); await sleep(6000)
  await p.tap(640, 360); await sleep(300)
  const O = '__open'
  // out of town (its square cannot be dug), onto the flat grass east of it
  await p.eval(`${O}.noa.entities.setPosition(${O}.noa.playerEntity, [26.5, 1, 0.5])`); await sleep(1500)
  ok((await p.eval(`${O}.battery.charge`)) === 100 && /100%/.test(await p.eval(`document.querySelector('.hud .batt').textContent`)), 'a new player starts with a full battery on the HUD')
  await p.eval(`${O}.noa.camera.pitch = 1.55`)
  await p.mouseHold(640, 360, 2000); await sleep(300)
  const c1 = await p.eval(`${O}.battery.charge`)
  ok(c1 < 100 && c1 > 95, `digging a few blocks drains it a little (${c1.toFixed(2)})`)
  // nearly empty: the warnings, then flat
  await p.eval(`${O}.battery.charge = 25.1; ${O}.battery.warned = []`)
  await p.mouseHold(640, 360, 1200); await sleep(300)
  ok((await p.eval(`${O}.sound.log`)).includes('low') && /Battery 25%/.test(await p.eval(`document.querySelector('.hud .toast').textContent`)), 'crossing 25% beeps and says so')
  ok(await p.eval(`document.querySelector('.hud .batt').classList.contains('amber')`), 'and the battery turns amber')
  await p.eval(`${O}.battery.charge = 0.2`)
  await p.mouseHold(640, 360, 1500); await sleep(300)
  const flat = await p.eval(`({ flat: ${O}.battery.flat, enabled: ${O}.digger.enabled, log: ${O}.sound.log.slice(-6) })`)
  ok(flat.flat && !flat.enabled && flat.log.includes('flat'), 'flat: the drill stops, with its own sound')
  const n = await p.eval(`${O}.digger.broken`)
  await p.mouseHold(640, 360, 1500); await sleep(300)
  ok((await p.eval(`${O}.digger.broken`)) === n, 'and holding the button digs nothing')
  // climbing: down a dug shaft, Space against its wall brings you up
  await p.eval(`(() => { const s = ${O}.state(), x = Math.floor(s.x), z = Math.floor(s.z)
    for (let y = 0; y > -12; y--) ${O}.world.set(x, y, z, 0)
    ${O}.noa.entities.setPosition(${O}.noa.playerEntity, [x + 0.5, -11, z + 0.5]) })()`); await sleep(1200)
  const bottom = (await p.eval(`${O}.state()`)).y
  await p.hold('Space', 3500); await sleep(500)
  const top = (await p.eval(`${O}.state()`)).y
  ok(bottom <= -10.9 && top > bottom + 8, `Space against the shaft wall climbs it (y ${bottom} -> ${top})`)
  // back down the shaft, out of the sun (at the surface it would charge), then save and reload
  await p.eval(`(() => { const s = ${O}.state(); ${O}.noa.entities.setPosition(${O}.noa.playerEntity, [s.x, -11, s.z]); ${O}.battery.charge = 0 })()`)
  await sleep(1000)
  await p.eval(`${O}.persist()`); await p.reload(); await sleep(6500)
  ok((await p.eval(`${O}.battery.flat`)), 'a flat battery is still flat after a reload')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
