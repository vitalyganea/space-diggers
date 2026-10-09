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
      lamp: +L.lamp.intensity.toFixed(2), dome: L.dome.isEnabled(), stars: !!L.dome.material.emissiveTexture, fog: [s.fogStart, s.fogEnd],
      drill: L.hand.root.getChildMeshes().every(m => m.isEnabled() && m.isVisible), drillZ: +L.hand.root.position.z.toFixed(3) } })()`)
  const top = await read()
  ok(top.sky.every(v => v < 0.12) && top.dome && top.stars && top.light > 0.95, `at the surface: the black sky of space with its starfield, and hard sunlight ${JSON.stringify(top)}`)
  await p.shot(OUT + '/look-sky.png')
  ok(top.drill, 'the drill is in hand')
  // the sky (row 36): real points for stars, the planets as their own crisp objects
  const sky = await p.eval(`(() => { const S = window.__dev.look.sky
    return { stars: S.stars.getTotalVertices() + S.brightStars.getTotalVertices(), points: S.stars.material.pointsCloud, planet: S.planet.isEnabled() && S.planet.billboardMode === 7 } })()`)
  ok(sky.stars > 1500 && sky.points && sky.planet, `the stars are ${sky.stars} points of light, the ringed planet a billboard of its own`)
  await p.eval('window.__dev.at(-20, 0.3)'); await sleep(1500)
  const mid = await read()
  ok(mid.fog[1] < top.fog[1] && mid.light < top.light && mid.lamp > top.lamp, `halfway to dark: closer fog, dimmer daylight, brighter lamp ${JSON.stringify(mid)}`)
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
  // far from the start, noa has shifted the world's origin several times: the sky must still be round the camera
  await p.eval('window.__dev.noa.entities.getPhysics(window.__dev.noa.playerEntity).body.gravityMultiplier = 0; window.__dev.noa.entities.setPosition(window.__dev.noa.playerEntity, [420.5, 20, -310.5]); 1')
  await sleep(2500)
  const far = await p.eval(`(() => { const S = window.__dev.look.sky; return { dome: S.dome.position.length(), planet: +S.planet.position.subtract(S.planet.home).length().toFixed(2), on: S.planet.isEnabled() } })()`)
  ok(far.dome < 0.01 && far.planet < 0.01 && far.on, `400 blocks away the sky is still in place round you (${JSON.stringify(far)})`)
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
