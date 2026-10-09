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
import { StrandedCard } from './ui/stranded.js'
import { OpenHud } from './ui/openhud.js'
import { clickToPlay } from './ui/hud.js'
import { addCrosshair } from './ui/crosshair.js'

export const SPAWN = [0.5, 1, 0.5]
const AUTOSAVE = 10

export function start(platform) {
  platform.loadingStart()
  const store = platform.storage
  const save = meta.load(store)
  const kept = loadWorld(store)
  const seed = kept ? kept.seed : Math.floor(Math.random() * 1e6) + 1

  const noa = createEngine({ playerStart: kept && kept.pos ? kept.pos : SPAWN })
  registerBlocks(noa)
  const world = new World(seed)
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
    if (bag.add(key)) { hud.pickup(`+1 ${ITEMS[key].name}`, ITEMS[key].color); sound.play('coin', ITEMS[key].value) }
    else if (performance.now() - fullWarned > 2500) { fullWarned = performance.now(); hud.toast('Backpack full! Go and sell'); sound.play('denied') }
  }
  const digger = new Digger(noa, {
    world, payOre: false,
    onCrack: (stage, b) => sound.play('crack', b.hard),
    onBreak: e => {
      sound.play('break', e.block.hard); collect(e.block.id)
      battery.use(e.block.hard); lastHard = e.block.hard
      const w = battery.warn()
      if (w) { hud.toast(`Battery ${Math.round(w * 100)}%!`); sound.play('low') }
      if (battery.flat) {
        sound.play('flat')
        if (strandedNow()) openCard()
        else hud.toast('Battery flat! Stand in the sun to charge')
      }
    },
  })
  digger.coins = save.coins
  const perk = meta.perk(save.chosen)
  digger.digSpeed = perk.digSpeed
  digger.coinMult = perk.coinMult
  applyLook(noa)
  addCrosshair()
  // stranded: the card with the ways out (src/stranded.js)
  const rescue = new Rescue()
  const strandedNow = () => battery.flat && depth() >= SURFACE_DEPTH
  const card = new StrandedCard(
    () => ({
      depth: depth(), coins: digger.coins, cost: rechargeCost(depth()), hasAds: platform.hasAds,
      items: Object.entries(bag.items).map(([key, n]) => ({ key, n, name: ITEMS[key].name, value: ITEMS[key].value })),
      job: rescue.job && { ...rescue.job, itemName: rescue.job.item && ITEMS[rescue.job.item].name }, left: rescue.left(),
    }),
    async (kind, arg) => {
      if (kind === 'close') { card.hide(); return }
      if (kind === 'pay') {
        const cost = rechargeCost(depth())
        if (digger.coins < cost) return
        digger.coins -= cost; battery.recharge(); sound.play('buy'); card.hide(); hud.toast('Recharged!')
      }
      if (kind === 'robot' && bag.take(arg)) { rescue.sendRobot(arg, ITEMS[arg].value, depth()); sound.play('thrown') }
      if (kind === 'free') rescue.callFree()
      if (kind === 'ad') {
        sound.setMuted(true)
        const watched = await platform.rewardedAd()
        applyMute()
        if (watched) { battery.recharge(); card.hide(); hud.toast('Recharged! Thanks for watching'); sound.play('buy') }
        else hud.toast('No ad right now: try another way')
      }
    })
  const openCard = () => { if (document.pointerLockElement) document.exitPointerLock(); card.show() }
  clickToPlay(() => !card.open, noa.container.element)

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

  // trying to dig on a flat battery down there brings the card back
  noa.inputs.down.on('fire', () => { if (strandedNow() && !card.open) openCard() })

  noa.on('tick', dt => {
    if (!loaded) { loaded = true; platform.loadingStop() }
    digger.enabled = !battery.flat
    // the sun charges the drill at the surface, slowly
    if (depth() < SURFACE_DEPTH && battery.fraction < 1) battery.recharge(battery.capacity * 0.04 * dt / 1000)
    const done = rescue.tick(dt / 1000)
    if (done && done.kind === 'trip') {
      digger.coins += done.value; sound.play('coin', done.value)
      hud.toast(`Your robot sold ${ITEMS[done.item].name}: +${done.value} coins`)
    }
    if (done && done.kind === 'free') {
      battery.recharge(battery.capacity * FREE_CHARGE); card.hide(); sound.play('buy')
      hud.toast('The rescue drone gave you some charge')
    }
    if (noa.inputs.state.jump && againstWall()) body.velocity[1] = Math.max(body.velocity[1], 4.2)
    if (document.pointerLockElement) platform.gameplayStart(); else platform.gameplayStop()
    sinceSave += dt / 1000
    if (sinceSave >= AUTOSAVE) { sinceSave = 0; persist() }
    hud.update({ coins: digger.coins, depth: depth(), bag, battery, blocksLeft: battery.blocksLeft(lastHard) })
  })

  if (import.meta.env.DEV) window.__open = { noa, world, digger, save, sound, bombs, persist, bag, battery, rescue, card, state: () => playerState(noa), depth }
}
