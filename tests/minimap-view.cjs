/* System 21 check: the minimap and depth meter.   node tests/minimap-view.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9408 })
  await p.navigate('http://localhost:5181/'); await sleep(6500)
  await p.eval(`(() => { const b = document.querySelector('.choose-robot .go'); if (b) b.click() })()`); await sleep(900)   // first start: the default robot, then "Click to play" shows
  const O = '__open'
  // the colour of the map at a world offset (i, j) from you
  const at = (i, j) => p.eval(`(() => { const c = document.querySelector('.minimap canvas'), d = c.getContext('2d').getImageData((${i} + 24) * 4 + 2, (24 - ${j}) * 4 + 2, 1, 1).data; return [d[0], d[1], d[2]] })()`)
  const where = () => p.eval(`document.querySelector('.minimap .where').textContent`)
  const meter = () => p.eval(`parseFloat(document.querySelector('.minimap .you').style.top)`)
  ok((await where()) === 'Surface' && (await meter()) === 0, 'in town: "Surface", the marker at the top of the meter')
  // a corner of the Trade Hub's square (its middle carries the white letter): it is at +z, so ABOVE you on the map
  const market = await p.eval(`(() => { const d = document.querySelector('.minimap canvas').getContext('2d').getImageData(24 * 4 - 4, (24 - 9) * 4 - 1, 1, 1).data; return [d[0], d[1], d[2]] })()`)
  ok(market[1] > market[0] + 30 && market[1] > market[2], `the Trade Hub (north, +z) is a green square above you on the map (${market})`)
  // the arrow turns the way you do: looking along +x (to the right in the world) it points right
  const arrow = async (h, wait = 500) => { await p.eval(`${O}.noa.camera.heading = ${h}; 1`); await sleep(wait)
    return p.eval(`(() => { const d = document.querySelector('.minimap canvas').getContext('2d').getImageData(100 - 12, 100 - 12, 24, 24).data
      // how far the white reaches each way from the middle: the point reaches further than the tail
      let x0 = 99, x1 = -99, y0 = 99, y1 = -99; for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) { const i = (y * 24 + x) * 4
        if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) { x0 = Math.min(x0, x - 12); x1 = Math.max(x1, x - 12); y0 = Math.min(y0, y - 12); y1 = Math.max(y1, y - 12) } }
      return [x1 + x0, y1 + y0] })()`) }
  const up = await arrow(0), right = await arrow(Math.PI / 2)
  // it turns at once (row 31 bis): the arrow is drawn every frame over the kept ground
  const quick = await arrow(0, 60)
  ok(quick[1] <= -2, `the arrow follows the mouse within a frame or two, not a fifth of a second later (${quick})`)
  const d0 = await p.eval(`${O}.minimap.groundDraws`); await sleep(2000)
  const perSec = ((await p.eval(`${O}.minimap.groundDraws`)) - d0) / 2
  ok(perSec <= 7, `standing still, the ground is redrawn only about five times a second (${perSec})`)
  ok(up[1] <= -2 && right[0] >= 1 && right[0] > up[0] && right[1] > up[1], `looking along +z the arrow points up, turning right it points right (${up.map(v => v.toFixed(1))} / ${right.map(v => v.toFixed(1))})`)
  // a tunnel 24 down, east of town
  await p.eval(`(() => { for (let y = 0; y > -25; y--) ${O}.world.set(40, y, 3, 0); for (let x = 40; x < 52; x++) for (const y of [-24, -23]) ${O}.world.set(x, y, 3, 0)
    ${O}.noa.entities.setPosition(${O}.noa.playerEntity, [40.5, -24, 3.5]) })()`); await sleep(1500)
  ok((await where()) === '24 m down', 'down the shaft: "24 m down"')
  const m = await meter()
  ok(m > 20 && m < 30, `the marker a quarter of the way to the Core (${m.toFixed(0)}%)`)
  const tunnel = await at(6, 0), rock = await at(6, 3)
  ok(tunnel.every(v => v < 30) && rock.some(v => v > 60), `the tunnel shows dark through the rock (${tunnel} vs ${rock})`)
  const edge = await p.eval(`(() => { const d = document.querySelector('.minimap canvas').getContext('2d').getImageData(0, 0, 196, 196).data
    let n = 0; for (let y = 0; y < 196; y++) for (let x = 0; x < 30; x++) { const i = (y * 196 + x) * 4; if (d[i] > 200 && d[i + 1] > 150 && d[i + 2] < 80) n++ } return n })()`)
  ok(edge > 10, 'the town off the map: a yellow arrow at the edge points home')
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
