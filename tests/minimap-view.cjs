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
  const at = (i, j) => p.eval(`(() => { const c = document.querySelector('.minimap canvas'), d = c.getContext('2d').getImageData((${i} + 24) * 4 + 2, (${j} + 24) * 4 + 2, 1, 1).data; return [d[0], d[1], d[2]] })()`)
  const where = () => p.eval(`document.querySelector('.minimap .where').textContent`)
  const meter = () => p.eval(`parseFloat(document.querySelector('.minimap .you').style.top)`)
  ok((await where()) === 'Surface' && (await meter()) === 0, 'in town: "Surface", the marker at the top of the meter')
  // a corner of the Market's square (its middle carries the white letter)
  const market = await p.eval(`(() => { const d = document.querySelector('.minimap canvas').getContext('2d').getImageData(24 * 4 - 4, (24 + 9) * 4 - 4, 1, 1).data; return [d[0], d[1], d[2]] })()`)
  ok(market[1] > market[0] + 30 && market[1] > market[2], `the Market is a green square on the map (${market})`)
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
