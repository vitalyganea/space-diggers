/* The open game: no round and no clock. One World per player, kept between
   sessions (src/persist.js); you start where you left off. Stage 1 grows
   it row by row: backpack, battery, stranding, the town, its shops, the
   minimap, the robot friend, the ticket home (SYSTEMS.md 15-24).

   In a dev build window.__open exposes it for the tests. */
import './ui/style.css'
import { createEngine, playerState } from './engine.js'
import { ID, registerBlocks } from './blocks.js'
import { World } from './world.js'
import { Digger } from './digging.js'
import { applyLook } from './look.js'
import { Bombs } from './bombs.js'
import { Sound } from './audio.js'
import * as meta from './meta.js'
import { saveWorld, loadWorld } from './persist.js'
import { ITEMS, Backpack, dropFor } from './items.js'
import { Battery } from './battery.js'
import { Rescue, rechargeCost, FREE_CHARGE, SURFACE_DEPTH } from './stranded.js'
import { chargeRate, onPad } from './charging.js'
import { tip } from './tips.js'
import { Meteors } from './meteors.js'
import { direction } from './companion.js'
import { meteorCraters } from './worldgen.js'
import { robotPanel } from './ui/robotpanel.js'
import { StrandedCard } from './ui/stranded.js'
import { doorNear, SPAWN } from './town.js'
import { nameBoards, DoorPrompt, buildingCard, shopCard } from './ui/townui.js'
import { market, workshop, bombShop } from './ui/shops.js'
import { Minimap } from './ui/minimap.js'
import { ROBOTS } from './robots.js'
import { Companion } from './companion.js'
import { chooseRobot, Talk } from './ui/robotui.js'
import { loadGear, value, nextCost, buy as buyGear, BOMB_PRICE, BOMB_CARRY, TICKET_PRICE, TICKET_CARRY } from './gear.js'
import { OpenHud } from './ui/openhud.js'
import { clickToPlay, lockMouse } from './ui/hud.js'
import { addCrosshair } from './ui/crosshair.js'

export { SPAWN }
const AUTOSAVE = 10

export function start(platform) {
  platform.loadingStart()
  const store = platform.storage
  const save = meta.load(store)
  const kept = loadWorld(store)
  // a new world's seed: random, or ?seed= (tests and playtests want the same world)
  const seed = kept ? kept.seed : (+new URLSearchParams(location.search).get('seed') || Math.floor(Math.random() * 1e6) + 1)

  const noa = createEngine({ playerStart: kept && kept.pos ? kept.pos : SPAWN })
  registerBlocks(noa)
  const world = new World(seed, { town: true })
  if (kept) world.edits = kept.edits
  world.attach(noa)

  const sound = new Sound()
  let siteMuted = false, userMuted = false
  const applyMute = () => sound.setMuted(siteMuted || userMuted)
  platform.onMute(m => { siteMuted = m; applyMute() })

  const hud = new OpenHud()
  const bag = new Backpack(save.backpack ? save.backpack.capacity : undefined, save.backpack ? save.backpack.items : {})
  const battery = new Battery(save.battery ? save.battery.capacity : undefined, save.battery ? save.battery.charge : null)
  let lastHard = 0.8                     // the last block dug, for "blocks left"
  let fullWarned = 0
  // what a block drops goes into the backpack; a full one loses it, and says so
  const collect = blockId => {
    const key = dropFor(blockId)
    if (!key) return
    if (bag.add(key)) {
      hud.pickup(`+1 ${ITEMS[key].name}`, ITEMS[key].color); sound.play('coin', ITEMS[key].value)
      if (bag.count === 1) say('Ooh! That goes in your backpack. The Trade Hub buys it.')
      if (bag.full) say('The backpack is full! Let\'s go and sell at the Trade Hub.')
    }
    else if (performance.now() - fullWarned > 2500) { fullWarned = performance.now(); hud.toast('Backpack full! Go and sell'); sound.play('denied') }
  }
  const digger = new Digger(noa, {
    world, payOre: false,
    onCrack: (stage, b) => sound.play('crack', b.hard),
    onBreak: e => {
      sound.play('break', e.block.hard); collect(e.block.id)
      battery.use(e.block.hard); lastHard = e.block.hard
      const w = battery.warn()
      if (w) { hud.toast(`Battery ${Math.round(w * 100)}%!`); sound.play('low'); say(w > 0.2 ? 'Battery at 25%. Think about heading back up!' : 'Battery 10%! We should climb up now.') }
      if (battery.flat) {
        sound.play('flat')
        if (strandedNow()) { openCard(); say('Out of power! I can fly up and sell something for us.') }
        else hud.toast('Battery flat! The charging pad in the base fills it')
      }
    },
  })
  digger.coins = save.coins
  digger.bombs = Math.max(0, Math.min(5, Math.floor(+save.bombs || 0)))
  let tickets = save.tickets || 0
  const perk = meta.perk(save.chosen)
  digger.digSpeed = perk.digSpeed
  digger.coinMult = perk.coinMult
  // the robot friend: chosen at the first start (below), then kept
  let robot = save.robot, buddy = null, talk = null
  const say = text => talk && talk.say(text)
  const look = applyLook(noa)
  // the Workshop's upgrades, kept for good
  const gear = loadGear(save.gear)
  const applyGear = () => {
    digger.speed = value(gear, 'drill')
    battery.capacity = value(gear, 'battery')
    bag.capacity = value(gear, 'backpack') + (robot ? ROBOTS[robot.kind].bagBonus : 0)
    look.lamp.range = value(gear, 'lamp')
  }
  applyGear()
  addCrosshair()
  // stranded: the card with the ways out (src/stranded.js)
  const rescue = new Rescue()
  const strandedNow = () => battery.flat && depth() >= SURFACE_DEPTH
  const card = new StrandedCard(
    () => ({
      depth: depth(), coins: digger.coins, cost: rechargeCost(depth()), hasAds: platform.hasAds,
      items: Object.entries(bag.items).map(([key, n]) => ({ key, n, name: ITEMS[key].name, value: ITEMS[key].value })),
      job: rescue.job && { ...rescue.job, itemName: rescue.job.item && ITEMS[rescue.job.item].name }, left: rescue.left(),
      tickets,
    }),
    async (kind, arg) => {
      if (kind === 'close') { card.hide(); lockMouse(noa.container.element); return }
      if (kind === 'pay') {
        const cost = rechargeCost(depth())
        if (digger.coins < cost) return
        digger.coins -= cost; battery.recharge(); sound.play('buy'); card.hide(); lockMouse(noa.container.element); hud.toast('Recharged!')
      }
      if (kind === 'robot' && bag.take(arg)) {
        rescue.sendRobot(arg, ITEMS[arg].value, depth(), robot ? ROBOTS[robot.kind].tripSpeed : 1)
        sound.play('thrown')
        if (buddy) buddy.leave()
        say(`I'll take the ${ITEMS[arg].name} up to the Trade Hub. Back soon!`)
      }
      if (kind === 'free') rescue.callFree()
      if (kind === 'ticket') { card.hide(); lockMouse(noa.container.element); goHome() }
      if (kind === 'ad') {
        sound.setMuted(true)
        const watched = await platform.rewardedAd()
        applyMute()
        if (watched) { battery.recharge(); card.hide(); hud.toast('Recharged! Thanks for watching'); sound.play('buy') }
        else hud.toast('No ad right now: try another way')
      }
    })
  const openCard = () => { if (document.pointerLockElement) document.exitPointerLock(); card.show() }

  // the town: boards over the doors, the prompt, E to go in. E was noa's
  // second binding for placing a block; that stays on the right button only.
  nameBoards(noa)
  const prompt = new DoorPrompt()
  const minimap = new Minimap(world)
  let inside = null
  noa.inputs.unbind('alt-fire')
  noa.inputs.bind('alt-fire', 'Mouse3')
  noa.inputs.bind('use', 'KeyE')
  // what the shops can do to the game
  const shop = {
    coins: () => digger.coins, bag, gear, bombs: () => digger.bombs, hasAds: platform.hasAds,
    sellMult: () => perk.coinMult,
    sellOne(k) {
      const n = bag.items[k] || 0
      if (!n || !bag.take(k, n)) return
      const c = Math.round(ITEMS[k].value * n * perk.coinMult)
      digger.coins += c; sound.play('coin', c); persist()
    },
    sellAll(mult) {
      const c = bag.sellAll(perk.coinMult * mult)
      if (!c) return
      digger.coins += c; sound.play('coin', c); hud.toast(`Sold for ${c} coins`); persist()
    },
    async sellAllAd() {
      if (!bag.count) return
      sound.setMuted(true)
      const ok = await platform.rewardedAd()
      applyMute()
      shop.sellAll(ok ? 2 : 1)
      if (!ok) hud.toast('No ad right now: sold at the normal price')
    },
    buyGear(k) {
      if (!buyGear(gear, k, digger)) { sound.play('denied'); return }
      applyGear()
      if (k === 'battery') battery.recharge()
      sound.play('buy'); hud.toast('Upgraded!'); persist()
    },
    tickets: () => tickets,
    buyTicket() {
      if (tickets >= TICKET_CARRY || digger.coins < TICKET_PRICE) { sound.play('denied'); return }
      digger.coins -= TICKET_PRICE; tickets++; sound.play('buy'); persist()
    },
    buyBomb() {
      if (digger.bombs >= BOMB_CARRY || digger.coins < BOMB_PRICE) { sound.play('denied'); return }
      digger.coins -= BOMB_PRICE; digger.bombs++; sound.play('buy'); persist()
    },
  }
  const SHOPS = { market: market(shop), workshop: workshop(shop), bombs: bombShop(shop) }
  const enter = door => {
    if (document.pointerLockElement) document.exitPointerLock()
    // Close is a click, so the mouse can be taken straight back: no second "Click to play"
    const close = () => { inside = null; lockMouse(noa.container.element) }
    const s = SHOPS[door.key]
    const soon = { pad: '<p>Coming soon: the rocket flies you to new planets.</p><p>An ice planet, a red one, one of lava and one of crystal, each with its own treasure.</p>' }
    inside = s ? shopCard(door.name, s.render, s.act, close) : buildingCard(door.name, soon[door.key] || '<p>Coming soon!</p>', close)
    sound.play('place')
  }
  // R: the robot's panel (row 35)
  const panel = robotPanel({
    robot: () => robot, bag, job: () => rescue.job, left: () => rescue.left(),
    send(item) {
      if (rescue.busy || !bag.take(item)) return null
      rescue.sendRobot(item, ITEMS[item].value, depth(), robot ? ROBOTS[robot.kind].tripSpeed : 1)
      sound.play('thrown'); if (buddy) buddy.leave()
      const line = `I'll take the ${ITEMS[item].name} to the Trade Hub. Back soon!`
      say(line); return line
    },
    scan() {
      const f = buddy && buddy.scan(world, 8)
      const line = f ? `I feel ${f.id === ID.stargem_ore ? 'a star gem' : f.id === ID.helium_ore ? 'helium' : 'gold'} ${f.dir}, ${f.dist} blocks away!` : 'Nothing shiny close by. Let\'s dig somewhere else!'
      if (f) ping = f.at
      say(line); return line
    },
    tip() {
      const costs = Object.keys(gear).map(k => nextCost(gear, k)).filter(c => c !== null)
      const line = tip({ batt: battery.fraction, depth: depth(), bag: bag.count, cap: bag.capacity, coins: digger.coins,
        cheapest: costs.length ? Math.min(...costs) : null, onPad: onPad(noa.entities.getPosition(noa.playerEntity)), tickets })
      say(line); return line
    },
  })
  noa.inputs.bind('robot', 'KeyR')
  noa.inputs.down.on('robot', () => {
    if (inside || choosing || card.open || !robot) return
    if (document.pointerLockElement) document.exitPointerLock()
    inside = shopCard('Your robot', panel.render, panel.act, () => { inside = null; lockMouse(noa.container.element) })
    sound.play('place')
  })
  noa.inputs.down.on('use', () => { const d = doorNear(noa.entities.getPosition(noa.playerEntity)); if (d && !inside) enter(d) })
  let choosing = !robot
  const meet = r => {
    robot = r
    save.robot = r
    buddy = new Companion(noa, r.kind)
    buddy.world = world
    talk = new Talk(r.kind, r.name)
    applyGear()
    choosing = false
  }
  if (robot) meet(robot)
  else chooseRobot(r => {
    meet(r)
    // that click was "Let's dig!": go straight in, no second "Click to play"
    lockMouse(noa.container.element)
    persist()                                  // chosen on a click, long after persist exists
    say(`Hi, I'm ${r.name}! Hold the left mouse button to dig down.`)
    say('Space against a wall climbs back up.')
    say('Press R if you need me!')
  })
  let sonarT = 0, ping = null, deepTip = false, meteorT = 0, meteorTip = false
  clickToPlay(() => !card.open && !inside && !choosing, noa.container.element, 'Click to play',
    'WASD move · Space jump and climb · hold left mouse to dig · E to go in · R your robot')

  const bombs = new Bombs(noa, world, {
    onFuse: () => sound.play('fuse'),
    onBlast: e => { e.broken.forEach(b => collect(b.id)); sound.play('boom', 1) },
  })
  noa.inputs.down.on('mid-fire', () => {
    if (digger.bombs <= 0) { hud.toast('No bombs'); sound.play('denied'); return }
    digger.bombs--
    sound.play('thrown')
    const p = noa.entities.getPosition(noa.playerEntity), d = noa.camera.getDirection()
    bombs.throw([p[0] + d[0] * 0.6, p[1] + 1.3, p[2] + d[2] * 0.6], d)
  })
  noa.inputs.down.on('alt-fire', () => {
    const t = noa.targetedBlock
    if (!t || digger.stock <= 0) return
    const [x, y, z] = t.adjacent, p = noa.entities.getPosition(noa.playerEntity)
    if (Math.floor(p[0]) === x && Math.floor(p[2]) === z && y >= Math.floor(p[1]) && y <= Math.floor(p[1]) + 1) return
    world.set(x, y, z, ID.rubble)
    digger.stock--
    sound.play('place')
  })
  window.addEventListener('keydown', e => {
    if (e.code !== 'KeyM') return
    userMuted = !userMuted
    applyMute()
    hud.toast(userMuted ? 'Sound off' : 'Sound on')
  })

  // keep the game: the world, where you stand, and your coins
  const persist = () => {
    save.coins = digger.coins
    save.backpack = bag.toJSON()
    save.battery = battery.toJSON()
    save.gear = { ...gear }
    save.bombs = digger.bombs
    save.tickets = tickets
    meta.store(store, save)
    return saveWorld(store, world, noa.entities.getPosition(noa.playerEntity))
  }
  let sinceSave = 0, loaded = false
  window.addEventListener('pagehide', persist)
  window.addEventListener('beforeunload', persist)

  const depth = () => Math.max(0, -Math.floor(noa.entities.getPosition(noa.playerEntity)[1] + 1e-6))
  // climbing: Space against a wall takes you up it, like a mole up its burrow
  const body = noa.entities.getPhysics(noa.playerEntity).body
  const againstWall = () => {
    const p = noa.entities.getPosition(noa.playerEntity)
    for (const [dx, dz] of [[0.65, 0], [-0.65, 0], [0, 0.65], [0, -0.65]])   // past the body (0.3) to the next cell
      for (const dy of [0.3, 1.2]) if (world.get(Math.floor(p[0] + dx), Math.floor(p[1] + dy), Math.floor(p[2] + dz)) !== 0) return true
    return false
  }

  // a ticket home: T, from anywhere, straight to the middle of town
  const goHome = () => {
    if (tickets <= 0) { hud.toast('No tickets: the Bomb Shop sells them'); sound.play('denied'); return }
    tickets--
    noa.entities.setPosition(noa.playerEntity, SPAWN)
    noa.entities.getPhysics(noa.playerEntity).body.velocity = [0, 0, 0]
    if (buddy && !buddy.away) buddy.pos = [SPAWN[0], SPAWN[1] + 3, SPAWN[2]]
    sound.play('go'); hud.toast('Home!')
    say('Home sweet home! Standing on the charging pad fills the battery.')
    persist()
  }
  noa.inputs.bind('ticket', 'KeyT')
  noa.inputs.down.on('ticket', () => { if (!inside && !choosing && !card.open) goHome() })

  // trying to dig on a flat battery down there brings the card back
  noa.inputs.down.on('fire', () => { if (strandedNow() && !card.open) openCard() })

  let charging = false, saidCharging = false
  // meteors from the rings (row 38)
  const meteors = new Meteors(noa, world, {
    skyDir: () => look.sky.planet.home.clone().normalize(),
    onFall: () => sound.play('whoosh'),
    onImpact: ({ at }) => {
      const q = noa.entities.getPosition(noa.playerEntity)
      const d = Math.hypot(at[0] - q[0], at[2] - q[2])
      sound.play('boom', Math.max(0.25, Math.min(1, 20 / d)))
      hud.toast('A meteor fell! It is on your map.')
      const dir = direction({ x: at[0] - q[0], y: 0, z: at[2] - q[2] }, noa.camera.heading)
      say(`A meteor fell ${dir}, ${Math.round(d)} blocks away! Meteor iron inside. Let's go!`)
      persist()
    },
  })
  noa.on('tick', dt => {
    if (!loaded) { loaded = true; platform.loadingStop() }
    digger.enabled = !battery.flat
    // the charging pad fills the battery fast; anywhere else it trickles back (src/charging.js)
    const here = noa.entities.getPosition(noa.playerEntity)
    if (battery.fraction < 1) {
      battery.recharge(battery.capacity * chargeRate(here, depth(), battery.flat) * dt / 1000)
      if (onPad(here) && !charging) { charging = true; sound.play('buy'); hud.toast('Charging...'); if (!saidCharging) { saidCharging = true; say('Charging! Stand here a moment.') } }
    }
    if (charging && (!onPad(here) || battery.fraction >= 1)) {
      if (battery.fraction >= 1) hud.toast('Battery full!')
      charging = false
    }
    const done = rescue.tick(dt / 1000)
    if (done && done.kind === 'trip') {
      digger.coins += done.value; sound.play('coin', done.value)
      hud.toast(`${robot ? robot.name : 'Your robot'} sold ${ITEMS[done.item].name}: +${done.value} coins`)
      if (buddy) buddy.back()
      say(`Ka-ching! +${done.value} coins.`)
    }
    if (done && done.kind === 'free') {
      battery.recharge(battery.capacity * FREE_CHARGE); card.hide(); sound.play('buy')
      hud.toast('The rescue drone gave you some charge')
    }
    if (noa.inputs.state.jump && againstWall()) body.velocity[1] = Math.max(body.velocity[1], 4.2)
    if (document.pointerLockElement) platform.gameplayStart(); else platform.gameplayStop()
    sinceSave += dt / 1000
    if (sinceSave >= AUTOSAVE) { sinceSave = 0; persist() }
    hud.update({ coins: digger.coins, depth: depth(), bag, battery, blocksLeft: battery.blocksLeft(lastHard), tickets })
    prompt.show(inside ? null : doorNear(noa.entities.getPosition(noa.playerEntity)))
    // the robot: follow, and Sonar's scouting every 2.5 s
    meteors.update(dt)
    if (buddy) { buddy.speaking = !!(talk && talk.busy); buddy.update(dt) }
    sonarT += dt / 1000
    if (buddy && sonarT > 2.5) {
      sonarT = 0
      const found = buddy.scan(world)
      if (found && (!ping || found.at.join() !== ping.join())) say(`I feel ${found.id === ID.stargem_ore ? 'a star gem' : found.id === ID.helium_ore ? 'helium' : 'gold'} ${found.dir}, ${found.dist} blocks away!`)
      ping = found ? found.at : null
    }
    // the first meteorite crater you come to (row 39)
    meteorT += dt / 1000
    if (!meteorTip && meteorT > 1) {
      meteorT = 0
      const q = noa.entities.getPosition(noa.playerEntity)
      if (meteorCraters(world.seed, q[0], q[2], 14).some(m => Math.hypot(q[0] - m.cx, q[2] - m.cz) < m.r + 4)) {
        meteorTip = true
        say('A meteorite crater! Its black rock is very hard, but full of meteor iron.')
      }
    }
    if (!deepTip && depth() > 6) { deepTip = true; say('Deep enough? Space against a wall takes you back up.') }
    minimap.update(dt / 1000, noa.entities.getPosition(noa.playerEntity), noa.camera.heading,
      { robot: buddy && !buddy.away ? buddy.pos : null, ping, meteors: meteors.marks })
  })

  if (import.meta.env.DEV) window.__open = { noa, world, meteors, digger, save, sound, bombs, persist, bag, battery, rescue, card, gear, look, minimap, inside: () => inside, tickets: () => tickets, robot: () => robot, buddy: () => buddy, talk: () => talk, state: () => playerState(noa), depth }
}
