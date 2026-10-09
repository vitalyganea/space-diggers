/* playtest-open.cjs: stage 1's loop, played for real (keys and mouse only)
   for several trips: walk to the dig site, dig down, climb out when the
   backpack is full or the battery low, walk to the Market and sell, walk
   to the Workshop and buy the cheapest upgrade it can, walk back, again.
   A stranded card, if one comes, is answered with the free rescue.
   Slow: not in tests/run.sh.

     npm run dev -- --port 5181 &   then   node tools/playtest-open.cjs [minutes]

   It reads window.__open to decide what to do next; every action is an
   input a person would make. */
const { launch, sleep } = require('./cdp.cjs')
const OUT = process.env.OUT || '/tmp/boom-playtest-open'
const MINUTES = +process.argv[2] || 8
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }

// the way between the dig site, the Market and the Workshop, round the buildings
const SITE = [26.5, 0.5]
const TO_MARKET = [[20, 6], [0.5, 5.5], [0.5, 7.4]]
const TO_WORKSHOP = [[4, 3], [8.4, 0.5]]
const TO_SITE = [[4, 5], [20, 6], SITE]

;(async () => {
  const p = await launch({ w: 1280, h: 720, port: 9420 })
  await p.navigate(`http://localhost:5181/?seed=${process.env.SEED || 7}`)
  await p.waitFor(`!!document.querySelector('.choose-robot .go')`)
  // a real click on "Let's dig!": that is the click that starts the game
  const go = await p.eval(`(() => { const r = document.querySelector('.choose-robot .go').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2] })()`)
  await p.tap(go[0], go[1]); await sleep(800)
  ok(await p.eval('!!document.pointerLockElement'), '"Let\'s dig!" goes straight into the game, mouse locked')
  const O = '__open'
  const st = () => p.eval(`(() => { const s = ${O}.state(); return { ...s, depth: ${O}.depth(), bag: ${O}.bag.count, cap: ${O}.bag.capacity,
    batt: ${O}.battery.fraction, coins: ${O}.digger.coins, card: ${O}.card.open, gear: { ...${O}.gear } } })()`)
  const relock = async () => { if (!(await p.eval('!!document.pointerLockElement'))) { await p.tap(640, 360); await sleep(300) } }
  const look = (h, pitch) => p.eval(`${O}.noa.camera.heading = ${h}; ${O}.noa.camera.pitch = ${pitch}`)

  async function walk(points) {
    for (const [tx, tz] of points) {
      for (let k = 0; k < 120; k++) {
        const s = await st()
        const dx = tx - s.x, dz = tz - s.z
        if (Math.hypot(dx, dz) < 0.45) break
        await look(Math.atan2(dx, dz), 0)
        await p.hold('KeyW', Math.min(400, 120 + Math.hypot(dx, dz) * 60))
        if (k % 10 === 9) await p.hold('Space', 120)               // a hop over anything in the way
      }
    }
  }
  /* stand in the middle of the block under you: short taps of W towards
     it, each followed by a stop, the way a person shuffles into place */
  async function centre() {
    for (let k = 0; k < 20; k++) {
      await p.waitFor(`Math.hypot(...${O}.noa.entities.getPhysics(${O}.noa.playerEntity).body.velocity) < 0.05`, 3000)
      const s = await st()
      const cx = Math.floor(s.x) + 0.5, cz = Math.floor(s.z) + 0.5
      const dx = cx - s.x, dz = cz - s.z
      if (Math.hypot(dx, dz) < 0.15) return true
      await look(Math.atan2(dx, dz), 0)
      await p.hold('KeyW', 40)
    }
    return false
  }
  /* lava under your feet: tunnel one block sideways (head height first,
     then the feet), step in, and carry on down. Like the race's bots. */
  const HEADING = [Math.PI / 2, 0, -Math.PI / 2, Math.PI]     // +x, +z, -x, -z
  const STEP = [[1, 0], [0, 1], [-1, 0], [0, -1]]
  async function roundLava() {
    const s = await st()
    const c = [Math.floor(s.x), Math.floor(s.y + 1e-6), Math.floor(s.z)]
    const get = (x, y, z) => p.eval(`${O}.world.get(${x}, ${y}, ${z})`)
    for (let d = 0; d < 4; d++) {
      const [dx, dz] = STEP[d]
      if ((await get(c[0] + dx, c[1], c[2] + dz)) === 6 || (await get(c[0] + dx, c[1] + 1, c[2] + dz)) === 6) continue
      for (const pitch of [0.05, 0.75]) {                      // the block at head height, then at the feet
        if ((await get(c[0] + dx, c[1] + (pitch < 0.5 ? 1 : 0), c[2] + dz)) === 0) continue
        await look(HEADING[d], pitch); await sleep(250)
        await p.holdUntil(`${O}.world.get(${c[0] + dx}, ${c[1] + (pitch < 0.5 ? 1 : 0)}, ${c[2] + dz}) === 0`, 8000)
      }
      await look(HEADING[d], 0)
      await p.hold('KeyW', 220)
      await centre()
      return true
    }
    return false
  }
  async function climbOut() {
    await look(Math.atan2(TO_MARKET[0][0] - SITE[0], TO_MARKET[0][1] - SITE[1]), 0)
    await p.keyDown('Space'); await p.keyDown('KeyW')
    for (let k = 0; k < 400 && (await st()).y < 0.95; k++) await sleep(150)
    await sleep(600)
    await p.keyUp('KeyW'); await p.keyUp('Space')
  }
  const click = sel => p.eval(`(() => { const b = document.querySelector('${sel}'); if (!b || b.disabled) return false; b.click(); return true })()`)
  async function useDoor() { await p.hold('KeyE', 80); await sleep(400) }

  const log = { trips: 0, sold: 0, upgrades: [], stranded: 0, maxDepth: 0 }
  const end = Date.now() + MINUTES * 60000
  await walk(TO_SITE)                                   // round the Workshop: straight east runs in at its door
  while (Date.now() < end) {
    // dig down until the backpack is full or the battery is low
    await relock()
    // come to a stop first: digging while still sliding from the walk ends up
    // with a hole beside you, which you stand next to instead of falling down
    await centre()
    await look(0, 1.5707)
    await sleep(300)
    await p.pointer('down', 640, 360)
    if (process.env.DEBUG) console.log('    dig at', JSON.stringify(await st()), 'target', JSON.stringify(await p.eval(`${O}.noa.targetedBlock && [...${O}.noa.targetedBlock.position]`)), 'fire', await p.eval(`${O}.noa.inputs.state.fire`))
    let lastBroken = await p.eval(`${O}.digger.broken`), stuckSince = Date.now()
    for (let k = 0; k < 2000; k++) {
      const s = await st()
      // nothing broken for 4 s: let go, shuffle back to the middle, look down, press again
      const broken = await p.eval(`${O}.digger.broken`)
      if (broken !== lastBroken) { lastBroken = broken; stuckSince = Date.now() }
      else if (Date.now() - stuckSince > 4000 && !s.card) {
        await p.pointer('up', 640, 360); await relock(); await centre(); await look(0, 1.5707); await sleep(200)
        await p.pointer('down', 640, 360); stuckSince = Date.now(); log.retries = (log.retries || 0) + 1
      }
      log.maxDepth = Math.max(log.maxDepth, s.depth)
      if (s.card) break
      if (s.bag >= s.cap || s.batt < 0.3 || Date.now() > end) break
      // lava below: go round it
      if ((await p.eval(`${O}.world.get(Math.floor(${s.x}), Math.floor(${s.y} + 1e-6) - 1, Math.floor(${s.z}))`)) === 6) {
        await p.pointer('up', 640, 360)
        log.lava = (log.lava || 0) + 1
        await roundLava()
        await look(0, 1.5707); await sleep(200)
        await p.pointer('down', 640, 360)
        continue
      }
      if (process.env.TRACE && k % 20 === 0) console.log('      trace', k, s.x, s.y, s.z, s.depth, s.bag, JSON.stringify(await p.eval(`[!!document.pointerLockElement, ${O}.noa.inputs.state.fire, ${O}.noa.targetedBlock && [...${O}.noa.targetedBlock.position], document.querySelector('.click-to-play').style.display]`)))
      if (process.env.DEBUG && k % 8 === 0) console.log('     ', k, JSON.stringify({ y: s.y, d: s.depth, bag: s.bag }), JSON.stringify(await p.eval(`({ t: ${O}.noa.targetedBlock && [...${O}.noa.targetedBlock.position], fire: ${O}.noa.inputs.state.fire, prog: +${O}.digger.progress.toFixed(2), en: ${O}.digger.enabled, lock: !!document.pointerLockElement, jump: ${O}.noa.inputs.state.jump, v: [...${O}.noa.entities.getPhysics(${O}.noa.playerEntity).body.velocity].map(x => +x.toFixed(2)), rest: [...${O}.noa.entities.getPhysics(${O}.noa.playerEntity).body.resting] })`)))
      await sleep(250)
    }
    await p.pointer('up', 640, 360)
    let s = await st()
    if (s.card) {                                                      // stranded: wait for the free drone
      log.stranded++
      await click('[data-act="free"]')
      await p.waitFor(`!${O}.card.open`, 240000)
      await relock()
    }
    if (Date.now() > end) break
    await climbOut()
    const coinsItems = (await st()).bag
    await walk(TO_MARKET); await useDoor()
    const coins0 = (await st()).coins
    await click('[data-act="sellAll"]'); await sleep(300)
    log.sold += (await st()).coins - coins0
    await click('.building .close'); await relock()
    log.trips++
    await walk(TO_WORKSHOP); await useDoor()
    // the cheapest upgrade it can afford, if any
    const bought = await p.eval(`(() => { const bs = [...document.querySelectorAll('[data-act="buy"]')].filter(b => !b.disabled)
      bs.sort((a, b) => parseInt(a.textContent.replace(/\\D/g, '')) - parseInt(b.textContent.replace(/\\D/g, '')))
      if (!bs.length) return null; bs[0].click(); return bs[0].dataset.arg })()`)
    if (bought) log.upgrades.push(bought)
    await sleep(300)
    await click('.building .close'); await relock()
    s = await st()
    log.items = (log.items || []).concat([coinsItems])
    console.log(`    trip ${log.trips}: ${coinsItems} items, sold for ${log.sold} in all, ${s.coins} coins, depth so far ${log.maxDepth}, gear ${JSON.stringify(s.gear)}`)
    await p.shot(`${OUT}/trip-${log.trips}.png`)
    // sun-charge a moment in town if the battery is low, then back to the shaft
    await p.waitFor(`${O}.battery.fraction > 0.8`, 30000)
    await walk(TO_SITE)
  }
  console.log(`    ${MINUTES} min: ${log.trips} trips, ${log.sold} coins from selling, upgrades ${log.upgrades.join(', ') || 'none'}, ` +
              `deepest ${log.maxDepth} m, stranded ${log.stranded}×, round lava ${log.lava || 0}×, re-tries ${log.retries || 0}, items per trip ${(log.items || []).join(' ')}`)
  ok(log.trips >= 2, `the loop goes round: ${log.trips} trips to sell`)
  ok(log.sold > 0, `selling pays (${log.sold} coins)`)
  ok(log.upgrades.length >= 1, `the coins buy upgrades (${log.upgrades.join(', ')})`)
  ok(log.maxDepth >= 15, `and the player gets deeper (${log.maxDepth} m)`)
  ok(p.errors.length === 0, 'console clean ' + JSON.stringify(p.errors.slice(0, 3)))
  await p.close()
  console.log(fails ? `${fails} failed` : 'all ok'); process.exit(fails ? 1 : 0)
})()
