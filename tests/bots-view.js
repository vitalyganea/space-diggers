/* System 7 check, on screen: ?dev=bots&speed=3.   node tests/bots-view.js */
const { launch, sleep } = require('../tools/cdp.js')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9384 })
  await p.navigate('http://localhost:5181/?dev=bots&speed=3'); await sleep(14000)
  const s = await p.eval(`window.__dev.bots.map((b, i) => {
    const D = window.__dev, noa = D.noa, x = Math.floor(b.pos[0]), e = noa.entities.getPosition(D.views[i].id)
    return { name: b.name, y: +b.pos[1].toFixed(1), dug: b.broken,
      onIt: Math.hypot(e[0] - b.pos[0], e[1] - b.pos[1], e[2] - b.pos[2]) < 0.3,
      holeKnown: D.world.get(x, -2, 0) === 0, holeDrawn: noa.getBlock(x, -2, 0) === 0 } })`)
  ok(s.every(b => b.y < -10 && b.dug > 10), `all five bots dig down (${s.map(b => b.name + ' ' + b.y).join(', ')})`)
  ok(s.every(b => b.onIt), 'each animal stands where its bot is')
  ok(s.every(b => b.holeKnown && b.holeDrawn), 'their shafts are in the World and drawn by noa near the player')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
