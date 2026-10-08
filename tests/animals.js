/* System 6 check: the animal models in ?dev=animals.   node tests/animals.js */
const { launch, sleep } = require('../tools/cdp.js')
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9382 })
  await p.navigate('http://localhost:5181/?dev=animals'); await sleep(6000)
  const read = () => p.eval(`window.__dev.crew.map(c => {
    const r = c.a.root, kids = r.getChildMeshes(false), bb = r.getHierarchyBoundingVectors(true, m => m !== c.a.tag)
    const leg = kids.find(m => m.name === 'footL').parent, arm = kids.find(m => m.name === 'drillBody').parent
    return { kind: c.kind, parts: kids.length, height: +(bb.max.y - bb.min.y).toFixed(2), width: +(bb.max.x - bb.min.x).toFixed(2),
      helmet: kids.some(m => m.name === 'helmet'), lamp: kids.some(m => m.name === 'lamp'),
      tag: !!c.a.tag && c.a.tag.billboardMode === 7, leg: +leg.rotation.x.toFixed(2), arm: +arm.rotation.x.toFixed(2),
      pos: window.__dev.noa.entities.getPosition(c.id).map(v => +v.toFixed(2)) } })`)
  const a = await read(); await sleep(350); const b = await read()
  for (const c of a) {
    ok(c.parts > 15 && c.helmet && c.lamp && c.tag, `${c.kind}: ${c.parts} parts, helmet with lamp, name tag facing the camera`)
    ok(c.height > 1.45 && c.height < 1.75 && c.width < 1.0, `${c.kind}: player-sized (${c.height} high, ${c.width} wide)`)
  }
  ok(a[0].leg === 0 && b[0].leg === 0 && a[0].arm === 0, 'the mole stands still')
  ok(a[1].leg !== b[1].leg && a[1].pos.join() !== b[1].pos.join(), `the beaver walks: legs swing (${a[1].leg} -> ${b[1].leg}) and it moves`)
  ok(a[2].arm < -0.5 && b[2].arm < -0.5 && a[2].arm !== b[2].arm, `the hamster digs: drill arm raised and pounding (${a[2].arm}, ${b[2].arm})`)
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
