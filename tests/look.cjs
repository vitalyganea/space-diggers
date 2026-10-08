/* System 5 check: the look in ?dev=look.   node tests/look.cjs */
const { launch, sleep } = require('../tools/cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-tests'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9380 })
  await p.navigate('http://localhost:5181/?dev=look'); await sleep(6000)
  const read = () => p.eval(`(() => { const s = window.__dev.noa.rendering.getScene(), L = window.__dev.look;
    return { sky: s.clearColor.asArray().slice(0, 3).map(v => +v.toFixed(2)), light: +window.__dev.noa.rendering.light.intensity.toFixed(2),
      lamp: +L.lamp.intensity.toFixed(2), dome: L.dome.isEnabled(), clouds: L.clouds.isEnabled(),
      drill: L.hand.root.getChildMeshes().every(m => m.isEnabled() && m.isVisible), drillZ: +L.hand.root.position.z.toFixed(3) } })()`)
  const top = await read()
  ok(top.sky[2] > 0.9 && top.dome && top.clouds && top.light > 0.95, `at the surface: blue sky, dome, clouds, full daylight ${JSON.stringify(top)}`)
  ok(top.drill, 'the drill is in hand')
  await p.eval('window.__dev.at(-20, 0.3)'); await sleep(1500)
  const mid = await read()
  ok(mid.sky[2] < top.sky[2] && mid.light < top.light && mid.lamp > top.lamp && !mid.clouds, `halfway to dark: dimmer sky and daylight, brighter lamp, no clouds ${JSON.stringify(mid)}`)
  await p.eval('window.__dev.at(-60, 0.3)'); await sleep(1500)
  const deep = await read()
  ok(deep.sky.every(v => v < 0.1) && deep.light < 0.2 && deep.lamp > 1.2 && !deep.dome, `deep down: near-black, the lamp does the lighting ${JSON.stringify(deep)}`)
  // the drill pushes forward while digging
  await p.tap(640, 360); await sleep(300)
  await p.eval('window.__dev.at(-88, 1.5)'); await sleep(800)   // the shaft floor (y -90) in reach
  const rest = (await read()).drillZ
  await p.pointer('down', 640, 360); await sleep(300)
  const busy = (await read()).drillZ
  await p.shot(OUT + '/look-digging.png')
  await p.pointer('up', 640, 360)
  ok(busy > rest + 0.02, `the drill pushes in while digging (z ${rest} -> ${busy})`)
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
