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
import { loadSettings, settingsCard } from './ui/settings.js'
import { openDay, claim, progress, dayString, questReward, questText } from './daily.js'
import { dailyCard, QuestList } from './ui/daily.js'
import { donate, wanted } from './museum.js'
import { makeDisplays } from './displays.js'
import { rollFind, FINDS, RARITY, SETS } from './finds.js'
import { Reveal } from './ui/reveal.js'
import { KEEPERS, lineFor, keeperSpots } from './shopkeepers.js'
import { makeAstronaut } from './people.js'
import { Music } from './music.js'
import { Hand, toolSpeed, hasLaser, LASER_ROCK } from './tools.js'
import { Meteors } from './meteors.js'
import { Creatures } from './creatures.js'
import { direction } from './companion.js'
import { meteorCraters } from './worldgen.js'
import { robotPanel } from './ui/robotpanel.js'
import { StrandedCard } from './ui/stranded.js'
import { doorNear, SPAWN, BUILDINGS } from './town.js'
import { nameBoards, DoorPrompt, buildingCard, shopCard } from './ui/townui.js'
import { market, workshop, bombShop, museumShop, robotBay } from './ui/shops.js'
import { loadRobotGear, robotStats, rgBuy, rgNext, SWAP_PRICE } from './robotgear.js'
import { Minimap } from './ui/minimap.js'
import { ROBOTS } from './robots.js'
import { Companion } from './companion.js'
import { chooseRobot, Talk, showTitle } from './ui/robotui.js'
import { showComic } from './ui/comic.js'
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
  // music (row 41): the surface theme up top, the deep one underground
  const music = new Music(sound)
  // settings (row 53): music, sounds, mouse speed
  const settings = loadSettings(save.settings)
  const applySettings = s => {
    music.setOn(s.music); sound.fxOff = !s.sounds
    noa.camera.sensitivityX = noa.camera.sensitivityY = 10 * s.mouse
    save.settings = { ...s }
  }
  applySettings(settings)
  let settingsOpen = false
  const openSettings = () => { if (settingsOpen) return; settingsOpen = true; settingsCard(settings, s => applySettings(s), () => { settingsOpen = false; persist() }) }
  music.play('surface')
  let siteMuted = false, userMuted = false
  const applyMute = () => sound.setMuted(siteMuted || userMuted)
  platform.onMute(m => { siteMuted = m; applyMute() })

  const hud = new OpenHud()
  const bag = new Backpack(save.backpack ? save.backpack.capacity : undefined, save.backpack ? save.backpack.items : {})
  const battery = new Battery(save.battery ? save.battery.capacity : undefined, save.battery ? save.battery.charge : null)
  let lastHard = 0.8                     // the last block dug, for "blocks left"
  let fullWarned = 0
  // what a block drops goes into the backpack; a full one loses it, and says so
  // daily quests (row 50): count progress, pay a finished one at once
  const quests = new QuestList()
  const quest = (id, n = 1) => {
    for (const q of progress(save.daily, id, n)) {
      const c = questReward(q)
      digger.coins += c; sound.play('win'); hud.toast(`Quest done: ${questText(q)} · +${c} coins`)
      say(`Quest done! +${c} coins.`)
    }
    quests.show(save.daily.quests)
  }
  // finds (row 47): a chance at one in any dug block, below the surface
  const reveal = new Reveal()
  const findIn = () => {
    const d = depth()
    if (d < 1) return
    const key = rollFind(d)
    if (!key) return
    if (!bag.add(key)) { hud.toast('Something shiny! But the backpack is full'); return }
    const f = FINDS[key], isNew = !save.found.includes(key)
    if (isNew) save.found.push(key)
    reveal.show(key, isNew)
    quest('finds')
    sound.play('find', RARITIES_N[f.rarity])
    const line = { legendary: `A ${f.name}! That is legendary!`, mythic: `The ${f.name}!! I can't believe it!`, epic: `Wow, a ${f.name}! Professor Hoot will love that.` }[f.rarity]
    if (line) say(line)
    else if (save.found.length === 1) say('A find! Sell it to Rita, or give it to the Museum for a set.')
  }
  const RARITIES_N = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 }
  const collect = blockId => {
    findIn()
    quest('dig')
    const key = dropFor(blockId)
    if (!key) return
    if (bag.add(key)) {
      if (key === 'copper') quest('copper')
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
  // the tool in hand (row 40) sets the speed for each block
  const hand = new Hand()
  digger.digSpeed = id => perk.digSpeed(id) * toolSpeed(hand.tool, id, gear)
  digger.coinMult = perk.coinMult
  // the robot friend: chosen at the first start (below), then kept
  let robot = save.robot, buddy = null, talk = null
  const robotGear = loadRobotGear(save.robotGear)            // the Robot Bay's upgrades (row 51)
  const say = text => talk && talk.say(text)
  const look = applyLook(noa)
  // the Workshop's upgrades, kept for good
  const gear = loadGear(save.gear)
  const applyGear = () => {
    digger.speed = 1                        // the tools' speeds go in digSpeed
    battery.capacity = value(gear, 'battery')
    const rs = robot ? robotStats(robot.kind, robotGear, ROBOTS[robot.kind]) : null
    bag.capacity = value(gear, 'backpack') + (rs ? rs.bagBonus : 0)
    if (buddy && rs) { buddy.light.range = rs.light; buddy.sonarRange = rs.sonarRange }
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
        rescue.sendRobot(arg, ITEMS[arg].value, depth(), robot ? robotStats(robot.kind, robotGear, ROBOTS[robot.kind]).tripSpeed : 1)
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
      digger.coins += c; lastSale = c; sound.play('coin', c); quest('sell', c); persist()
    },
    sellAll(mult) {
      const c = bag.sellAll(perk.coinMult * mult)
      if (!c) return
      digger.coins += c; lastSale = c; sound.play('coin', c); hud.toast(`Sold for ${c} coins`); quest('sell', c); persist()
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
      if (k === 'laser') { showTool(false); if (gear.laser === 1) say('A laser! Aim at black meteorite rock or crystal and it comes to hand by itself.') }
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
  // the Museum (row 48): Professor Hoot takes your finds
  let museumNews = {}
  shop.save = save
  shop.donate = key => {
    const r = donate(save, bag, key)
    if (!r) return
    museumNews = { gave: true }
    quest('museum')
    sound.play('find', 2)
    if (r.done) {
      digger.coins += r.reward; museumNews.setDone = SETS[r.set].name
      sound.play('win'); hud.toast(`${SETS[r.set].name} complete! +${r.reward} coins`)
      say(`We completed the ${SETS[r.set].name}! +${r.reward} coins!`)
    }
    displays.refresh()
    persist()
  }
  const displays = makeDisplays(noa, save)                   // the Museum's show cases (row 49)
  // the Robot Bay (row 51): Sprocket's upgrades and swaps
  let robotNews = ''
  shop.robot = () => robot
  shop.robotGear = robotGear
  shop.buyRobotGear = k => {
    if (!rgBuy(robotGear, k, digger)) { sound.play('denied'); return }
    save.robotGear = robotGear; applyGear(); sound.play('buy'); robotNews = 'All tuned up! Your robot feels great.'
    say(k === 'speed' ? 'Wheee! I am faster now!' : k === 'light' ? 'Look how bright my light is!' : 'I feel stronger! Thank you!')
    persist()
  }
  shop.swapRobot = kind => {
    if (digger.coins < SWAP_PRICE || !robot || robot.kind === kind || (buddy && buddy.away)) { sound.play('denied'); return }
    digger.coins -= SWAP_PRICE
    if (buddy) buddy.dispose()
    if (talk) talk.el.remove()                                   // its speech bubble goes with it
    meet({ kind, name: robot.name }); sound.play('buy'); robotNews = `Here is ${robot.name}, as a ${ROBOTS[kind].name} now!`
    say(`Hi again! It's me, ${robot.name}, in a new body!`)
    persist()
  }
  const SHOPS = { market: market(shop), workshop: workshop(shop), bombs: bombShop(shop), museum: museumShop(shop), robots: robotBay(shop) }
  // the shopkeepers (row 46): one behind each module's counter; you buy from them
  let lastSale = 0
  const keepers = BUILDINGS.map(b => {
    const K = KEEPERS[b.key], spot = keeperSpots(b)
    const a = makeAstronaut(noa.rendering.getScene(), K.look, m => noa.rendering.addMeshToScene(m))
    noa.rendering.addMeshToScene(a.root, false, spot.keeper)
    a.root.rotation.y = Math.atan2(b.face[0], b.face[1])                    // facing the door
    return { key: b.key, b, K, a, spot, waved: false }
  })
  const keeperState = () => {
    const costs = Object.keys(gear).map(k => nextCost(gear, k)).filter(c => c !== null)
    const best = Object.keys(bag.items).sort((x, y) => ITEMS[y].value - ITEMS[x].value)[0] || null
    return { bag: bag.items, bagCount: bag.count, coins: digger.coins, cheapest: costs.length ? Math.min(...costs) : null,
      laser: gear.laser || 0, bombs: digger.bombs, tickets, justSold: lastSale, best,
      canGive: wanted(save, bag).length > 0, gave: museumNews.gave, setDone: museumNews.setDone,
      robotNews, robotCheapest: (() => { const c = Object.keys(robotGear).map(k => rgNext(robotGear, k)).filter(x => x !== null); return c.length ? Math.min(...c) : null })() }
  }
  const keeperHead = key => {
    const K = KEEPERS[key]
    return `<div class="keeper"><span class="keeper-face" style="background:${K.look.skin};border-color:${K.look.accent};box-shadow:inset 0 9px 0 ${K.look.hairStyle === 'bald' ? K.look.skin : K.look.hair}"><i></i><i></i><b></b></span>
      <div><b>${K.name}</b><span>${lineFor(key, keeperState(), Math.random())}</span></div></div>`
  }
  const enter = door => {
    if (document.pointerLockElement) document.exitPointerLock()
    // Close is a click, so the mouse can be taken straight back: no second "Click to play"
    const close = () => { inside = null; lockMouse(noa.container.element) }
    const s = SHOPS[door.key]
    lastSale = 0; museumNews = {}; robotNews = ''
    const soon = { pad: '<p>Coming soon: the rocket flies you to new planets.</p><p>An ice planet, a red one, one of lava and one of crystal, each with its own treasure.</p>' }
    if (door.key === 'portal') {
      // the race (row 52): five bots, the Core, coins for your place; back here after
      inside = buildingCard(door.name, `<p>Race five diggers down to the Core! The faster you get there, the more coins you win.</p>
        <p>Your coins come with you, and back.</p><div class="row"><button class="btn race">Race!</button></div>`, close)
      inside.querySelector('.race').addEventListener('click', () => { persist(); location.href = `${location.pathname}?mode=race&from=moon` })
      sound.play('place'); return
    }
    if (s) inside = shopCard(door.name, () => keeperHead(door.key) + s.render(), s.act, close)
    else if (KEEPERS[door.key]) inside = buildingCard(door.name, keeperHead(door.key), close)
    else inside = buildingCard(door.name, soon[door.key] || '<p>Coming soon!</p>', close)
    sound.play('place')
  }
  // R: the robot's panel (row 35)
  const panel = robotPanel({
    robot: () => robot, bag, job: () => rescue.job, left: () => rescue.left(),
    send(item) {
      if (rescue.busy || !bag.take(item)) return null
      rescue.sendRobot(item, ITEMS[item].value, depth(), robot ? robotStats(robot.kind, robotGear, ROBOTS[robot.kind]).tripSpeed : 1)
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
  noa.inputs.down.on('use', () => { if (creatures.use(noa.entities.getPosition(noa.playerEntity))) return; const d = doorNear(noa.entities.getPosition(noa.playerEntity)); if (d && !inside) enter(d) })
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
  // the start (row 42): the camera circles the base while you choose a robot,
  // or, coming back, behind the title and its Play button
  let titling = false
  const eye = noa.entities.add([0.5, 13, 0.5], 0.1, 0.1, null, null, false, false)
  const ownTarget = noa.camera.cameraTarget          // noa's own: an entity that follows the player at eye height
  let showing = false
  const showcase = on => {
    showing = on
    document.body.classList.toggle('showcase', on)
    noa.camera.cameraTarget = on ? eye : ownTarget
    noa.camera.zoomDistance = on ? 26 : 0
    if (on) { noa.camera.pitch = 0.3; noa.camera.currentZoom = 26 } else noa.camera.currentZoom = 0
    if (look.hand) { if (on) { look.hand.root.setEnabled(false); look.hand.laser.setEnabled(false) } else look.hand.setTool(hand.tool) }
  }
  showcase(true)
  /* Into the game from the start screen, on a click: the daily reward first
     if there is one today (its Claim is then the click that takes the mouse),
     and today's quests on the screen (row 50). */
  const startPlaying = () => {
    showcase(false)
    const today = dayString(), r = openDay(save.daily, today)
    quests.show(save.daily.quests)
    if (!r.reward) { titling = false; lockMouse(noa.container.element); return }
    dailyCard(r.streakDay, () => {
      const R = r.reward
      if (R.coins) digger.coins += R.coins
      if (R.bombs) digger.bombs = Math.min(BOMB_CARRY, digger.bombs + R.bombs)
      if (R.tickets) tickets = Math.min(TICKET_CARRY, tickets + R.tickets)
      if (R.find) {
        const rare = Object.values(FINDS).filter(f => f.rarity === R.find && !save.found.includes(f.key))
        const f = rare.length ? rare[Math.floor(Math.random() * rare.length)] : Object.values(FINDS).find(x => x.rarity === R.find)
        if (bag.add(f.key)) { if (!save.found.includes(f.key)) save.found.push(f.key); reveal.show(f.key, true) } else digger.coins += f.value
      }
      claim(save.daily, today, r.streakDay)
      sound.play('win'); titling = false; lockMouse(noa.container.element); persist()
      say(r.streakDay === 7 ? 'Seven days in a row! A rare treasure for you!' : `Day ${r.streakDay}! Come back tomorrow for more.`)
    })
  }
  if (robot) {
    meet(robot)
    titling = true
    showTitle(robot, () => startPlaying(),
      () => showComic(robot, () => {}), openSettings)                  // "How to play" shows the comic again
  } else chooseRobot(r => {
    meet(r)
    persist()                                  // chosen on a click, long after persist exists
    // then the comic (row 43); its last button (or Skip) is the click that starts the game
    titling = true
    showComic(r, () => {
      startPlaying()
      say(`Hi, I'm ${r.name}! Hold the left mouse button to dig down.`)
      say('Press R if you need me!')
    })
  })
  let deepestToday = 0, sonarT = 0, ping = null, deepTip = false, meteorT = 0, meteorTip = false
  clickToPlay(() => !card.open && !inside && !choosing && !titling && !settingsOpen, noa.container.element, 'Click to play',
    'WASD move · Space jump and climb · hold left mouse to dig · E to go in · R your robot', openSettings)

  const bombs = new Bombs(noa, world, {
    onFuse: () => sound.play('fuse'),
    onBlast: e => {
      e.broken.forEach(b => collect(b.id)); sound.play('boom', 1)
      const w = creatures.worm; if (w && Math.hypot(w.pos[0] - e.center[0], w.pos[1] - e.center[1], w.pos[2] - e.center[2]) < 9) creatures.scareWorm()
    },
  })
  noa.inputs.down.on('mid-fire', () => {
    if (digger.bombs <= 0) { hud.toast('No bombs'); sound.play('denied'); return }
    digger.bombs--
    sound.play('thrown')
    const p = noa.entities.getPosition(noa.playerEntity), d = noa.camera.getDirection()
    bombs.throw([p[0] + d[0] * 0.6, p[1] + 1.3, p[2] + d[2] * 0.6], d)
    quest('bomb')
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

  let charging = false, saidCharging = false, laserTip = false
  // the tool chip on the HUD, and 1 / 2 / the wheel to change by hand
  const toolChip = document.createElement('div')
  toolChip.className = 'hud tool-chip panel'
  document.body.appendChild(toolChip)
  const showTool = changed => {
    if (look.hand && !showing) look.hand.setTool(hand.tool)
    toolChip.innerHTML = hasLaser(gear)
      ? `<span class="${hand.tool === 'drill' ? 'on' : ''}"><kbd>1</kbd> Drill</span><span class="${hand.tool === 'laser' ? 'on' : ''}"><kbd>2</kbd> Laser</span>`
      : '<span class="on">Drill</span>'
    if (changed) sound.play('beep')
  }
  showTool(false)
  noa.inputs.bind('tool1', 'Digit1'); noa.inputs.bind('tool2', 'Digit2')
  noa.inputs.down.on('tool1', () => { hand.choose('drill', gear); showTool(true) })
  noa.inputs.down.on('tool2', () => { if (!hasLaser(gear)) { hud.toast('No laser yet: the Workshop sells one'); return } hand.choose('laser', gear); showTool(true) })
  noa.container.element.addEventListener('wheel', e => { if (document.pointerLockElement && hasLaser(gear)) { hand.next(gear); showTool(true) } }, { passive: true })
  // creatures (row 44), no fighting
  const creatures = new Creatures(noa, world, {
    takeCoin: () => { if (digger.coins <= 0) return false; digger.coins--; return true },
    bump: d => { const L = Math.hypot(d[0], d[2]) || 1; noa.entities.getPhysics(noa.playerEntity).body.applyImpulse([d[0] / L * 6, 4, d[2] / L * 6]) },
    say: text => say(text),
    sound: n => sound.play(n),
    takeShard: () => bag.take('shard'),
    giveItem: item => { if (bag.add(item)) { sound.play('coin', 5); hud.toast(`The rock pup found ${ITEMS[item].name}!`); say(`It found ${ITEMS[item].name} for you!`) } else hud.toast('Backpack full!') },
  })
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
      if (onPad(here) && !charging) { charging = true; quest('charge'); sound.play('buy'); hud.toast('Charging...'); if (!saidCharging) { saidCharging = true; say('Charging! Stand here a moment.') } }
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
    if (noa.inputs.state.jump && againstWall()) {
      body.velocity[1] = Math.max(body.velocity[1], 4.2)
      // forgiving for children: rock over your head but open beside it (you dug ore out of the
      // wall, and are no longer under your shaft): drift towards the open side and climb on
      const q = noa.entities.getPosition(noa.playerEntity), hx = Math.floor(q[0]), hz = Math.floor(q[2]), hy = Math.floor(q[1] + 2.05)
      if (world.get(hx, hy, hz) !== 0) {
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (world.get(hx + dx, hy, hz + dz) === 0 && world.get(hx + dx, hy - 1, hz + dz) === 0) {
            body.velocity[0] = (hx + dx + 0.5 - q[0]) * 4; body.velocity[2] = (hz + dz + 0.5 - q[2]) * 4
            break
          }
        }
      }
    }
    if (document.pointerLockElement) platform.gameplayStart(); else platform.gameplayStop()
    sinceSave += dt / 1000
    if (sinceSave >= AUTOSAVE) { sinceSave = 0; persist() }
    hud.update({ coins: digger.coins, depth: depth(), bag, battery, blocksLeft: battery.blocksLeft(lastHard), tickets })
    prompt.show(inside ? null : doorNear(noa.entities.getPosition(noa.playerEntity)))
    // the robot: follow, and Sonar's scouting every 2.5 s
    meteors.update(dt)
    {
      const q = noa.entities.getPosition(noa.playerEntity)
      for (const k of keepers) {
        const dx = q[0] - k.spot.keeper[0], dz = q[2] - k.spot.keeper[2], d = Math.hypot(dx, dz)
        const near = d < 7 && Math.abs(q[1] - 1) < 2
        if (near) k.a.root.rotation.y = Math.atan2(dx, dz)
        if (near && !k.waved) { k.waved = true; k.waveT = 2 }
        if (d > 9) k.waved = false
        k.waveT = Math.max(0, (k.waveT || 0) - dt / 1000)
        k.a.update(dt, 0, false, k.waveT > 0)
      }
    }
    if (!choosing && !titling) creatures.update(dt)
    if (choosing || titling) noa.camera.heading += dt / 1000 * 0.07         // the start screen's slow circle
    music.play(choosing || titling ? 'menu' : depth() > 4 ? 'deep' : 'surface')
    // the tool picks itself when what you aim at changes kind
    const aimed = noa.targetedBlock ? noa.targetedBlock.blockID : null
    const was = hand.tool
    hand.aim(aimed, gear)
    if (hand.tool !== was) showTool(true)
    if (aimed && LASER_ROCK.has(aimed) && !hasLaser(gear) && !laserTip) { laserTip = true; say('This black rock is very hard. A laser from the Workshop cuts it three times as fast!') }
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
    if (depth() > deepestToday) { deepestToday = depth(); if (deepestToday % 5 === 0) quest('deep', deepestToday) }
    if (!deepTip && depth() > 6) { deepTip = true; say('Deep enough? Space against a wall takes you back up.') }
    minimap.update(dt / 1000, noa.entities.getPosition(noa.playerEntity), noa.camera.heading,
      { robot: buddy && !buddy.away ? buddy.pos : null, ping, meteors: meteors.marks })
  })

  if (import.meta.env.DEV) window.__open = { noa, world, meteors, music, creatures, reveal, displays, digger, save, sound, bombs, persist, bag, battery, rescue, card, gear, look, minimap, inside: () => inside, tickets: () => tickets, robot: () => robot, buddy: () => buddy, talk: () => talk, state: () => playerState(noa), depth }
}
