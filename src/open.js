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
  const digger = new Digger(noa, {
    world,
    onCrack: (stage, b) => sound.play('crack', b.hard),
    onBreak: e => { sound.play('break', e.block.hard); if (e.coins) sound.play('coin', e.coins) },
  })
  digger.coins = save.coins
  const perk = meta.perk(save.chosen)
  digger.digSpeed = perk.digSpeed
  digger.coinMult = perk.coinMult
  applyLook(noa)
  addCrosshair()
  clickToPlay(() => true, noa.container.element)

  const bombs = new Bombs(noa, world, {
    onFuse: () => sound.play('fuse'),
    onBlast: e => { digger.coins += e.coins; sound.play('boom', 1) },
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
    meta.store(store, save)
    return saveWorld(store, world, noa.entities.getPosition(noa.playerEntity))
  }
  let sinceSave = 0, loaded = false
  window.addEventListener('pagehide', persist)
  window.addEventListener('beforeunload', persist)

  const depth = () => Math.max(0, -Math.floor(noa.entities.getPosition(noa.playerEntity)[1] + 1e-6))
  noa.on('tick', dt => {
    if (!loaded) { loaded = true; platform.loadingStop(); digger.enabled = true }
    if (document.pointerLockElement) platform.gameplayStart(); else platform.gameplayStop()
    sinceSave += dt / 1000
    if (sinceSave >= AUTOSAVE) { sinceSave = 0; persist() }
    hud.update({ coins: digger.coins, depth: depth() })
  })

  if (import.meta.env.DEV) window.__open = { noa, world, digger, save, sound, bombs, persist, state: () => playerState(noa), depth }
}
