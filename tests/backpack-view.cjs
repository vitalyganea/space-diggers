/* System 16 check in the open game: ore goes into the backpack, a full one
   says so, and it is kept.   node tests/backpack-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9400 })
  await p.navigate('http://localhost:5181/'); await sleep(6000)
  await p.eval(`(() => { const b = document.querySelector('.choose-robot .go'); if (b) b.click() })()`); await sleep(900)   // first start: the default robot, then "Click to play" shows
  await p.tap(640, 360); await sleep(300)
  const O = '__open'
  // gold right under the feet, then copper under that
  await p.eval(`(() => { const s = ${O}.state(), x = Math.floor(s.x), z = Math.floor(s.z), y = Math.floor(s.y)
    ${O}.world.set(x, y - 1, z, 10); ${O}.world.set(x, y - 2, z, 8); ${O}.noa.camera.pitch = 1.55 })()`); await sleep(300)
  await p.holdUntil(`${O}.bag.items.gold === 1`); await sleep(300)
  let s = await p.eval(`({ items: ${O}.bag.items, coins: ${O}.digger.coins, hud: document.querySelector('.hud .bag b').textContent })`)
  ok(s.items.gold === 1 && s.coins === 0, `gold goes into the backpack, not into coins (${JSON.stringify(s)})`)
  ok(/^[12]\/20$/.test(s.hud), `the HUD shows the backpack filling (${s.hud})`)
  await p.holdUntil(`${O}.bag.items.copper === 1`); await sleep(300)
  ok((await p.eval(`${O}.bag.items.copper`)) === 1, 'then the copper under it')
  // a full backpack keeps nothing more and says so
  await p.eval(`(() => { ${O}.bag.capacity = ${O}.bag.count; const s = ${O}.state()
    ${O}.world.set(Math.floor(s.x), Math.floor(s.y) - 1, Math.floor(s.z), 9) })()`); await sleep(300)
  await p.holdUntil(`${O}.digger.broken >= 3`); await sleep(300)
  s = await p.eval(`({ titanium: ${O}.bag.items.titanium || 0, toast: document.querySelector('.hud .toast').textContent, full: document.querySelector('.hud .bag').classList.contains('full') })`)
  ok(s.titanium === 0 && /Backpack full/.test(s.toast) && s.full, `a full backpack takes no more and says so ("${s.toast}")`)
  await p.eval(`${O}.persist()`); await p.reload(); await sleep(6500)
  s = await p.eval(`${O}.bag.toJSON()`)
  ok(s.items.gold === 1 && s.items.copper === 1, `after a reload the backpack is as it was (${JSON.stringify(s)})`)
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
