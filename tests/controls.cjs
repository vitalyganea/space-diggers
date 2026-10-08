/* System 1 check: engine & controls in ?dev=controls, real keys and mouse
   in headless Chrome.   node tests/controls.cjs  (vite dev on :5181) */
const { launch, sleep } = require('../tools/cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-tests'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }

;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9372 })
  await p.navigate('http://localhost:5181/?dev=controls')
  await sleep(6000)
  const st = () => p.eval('window.__dev.state()')
  let s = await st()
  ok(s && s.onGround && Math.abs(s.y) < 0.05, `stands on the floor (${JSON.stringify(s)})`)

  await p.tap(640, 360); await sleep(500)
  s = await st()
  ok(s.locked, 'a click locks the mouse to the game')
  const h0 = s.heading
  await p.pointer('move', 640, 360); await p.pointer('move', 740, 360); await sleep(200)
  s = await st()
  ok(Math.abs(s.heading - h0) > 0.05, `moving the mouse turns the view (heading ${h0} -> ${s.heading})`)
  await p.eval('window.__dev.noa.camera.heading = 0, window.__dev.noa.camera.pitch = 0')

  // in noa, heading 0 looks down +z and heading PI down -z (towards the wall)
  await p.eval('window.__dev.teleport(0.5, 0, 0.5)'); await sleep(300)
  await p.hold('KeyW', 600); await sleep(300)
  const a = await st()
  ok(a.z > 3 && Math.abs(a.x - 0.5) < 0.3, `W walks the way he looks (heading 0: z 0.5 -> ${a.z})`)
  await p.eval('window.__dev.teleport(0.5, 0, 0.5); window.__dev.noa.camera.heading = Math.PI'); await sleep(300)
  await p.hold('KeyW', 2500); await sleep(300)
  const b = await st()
  ok(b.z > -7.1 && b.z < -6.5, `the wall stops him (z ${b.z}; wall face at -7)`)
  await p.shot(OUT + '/c1-at-wall.png')

  await p.eval('window.__dev.teleport(0.5, 0, 0.5); window.__dev.noa.camera.heading = 0'); await sleep(300)
  await p.hold('KeyD', 600); await sleep(300)
  const c = await st()
  ok(c.x > 2 && Math.abs(c.z - 0.5) < 0.3, `D strafes right (x ${c.x}, z ${c.z})`)
  await p.eval('window.__dev.teleport(0.5, 0, 0.5)'); await sleep(300)
  await p.hold('KeyA', 600); await sleep(300)
  const d = await st()
  ok(d.x < -1, `A strafes left (x ${d.x})`)

  // jump height: sample y through one jump on the flat
  await p.eval('window.__dev.teleport(-3.5, 0, 0.5)'); await sleep(400)
  await p.eval(`window.__peak = 0; (function f(){ const y = window.__dev.state().y; if (y > window.__peak) window.__peak = y; if (!window.__stop) requestAnimationFrame(f) })()`)
  await p.hold('Space', 120); await sleep(1500)
  const peak = await p.eval('window.__stop = true, window.__peak')
  ok(peak > 1.05 && peak < 2.0, `a jump clears one block and not two (peak ${peak.toFixed(2)})`)
  const e = await st()
  ok(e.onGround && Math.abs(e.y) < 0.05, 'and he lands again')

  // onto the one-block step (x=2, z=2) and on into the two-block one (z=4)
  await p.eval('window.__dev.teleport(2.5, 0, 0.5); window.__dev.noa.camera.heading = 0'); await sleep(400)
  await p.eval(`window.__tr = []; (function f(){ const s = window.__dev.state(); window.__tr.push([s.y, s.z]); if (window.__tr.length < 150) requestAnimationFrame(f) })()`)
  await p.keyDown('KeyW'); await sleep(250); await p.hold('Space', 150); await sleep(600); await p.keyUp('KeyW'); await sleep(400)
  const tr = await p.eval('window.__tr')
  ok(tr.some(t => t[1] > 2.1 && t[1] < 2.9 && t[0] >= 0.99), 'W + Space climbs onto the one-block step (stood on it at y 1)')
  const f = await st()
  ok(f.z > 3.5 && f.z < 3.75, `the two-block step stops him (z ${f.z}; its face at 3.7)`)

  // into the pit
  await p.eval('window.__dev.teleport(4.5, 0.5, -1.5)'); await sleep(1500)
  const g = await st()
  ok(g.y < -2.9 && g.onGround, `falls into the pit and lands on its floor (y ${g.y})`)
  await p.shot(OUT + '/c2-in-pit.png')

  ok(p.errors.filter(x => !/favicon|404/.test(x)).length === 0, 'console clean ' + JSON.stringify(p.errors))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok')
  process.exit(fails ? 1 : 0)
})()
