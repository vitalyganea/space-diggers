/* The game: one round of Space Diggers. You in lane 0, five bots in the
   others, a countdown, the race to the Core, the results, Play again.

   For tests: ?seed= fixes the world, ?speed= runs the bots that many
   times as fast, ?limit= sets the round's length in seconds. In a dev
   build window.__game exposes the round. */
import './ui/style.css'
import { createEngine, playerState } from './engine.js'
import { ID, registerBlocks } from './blocks.js'
import { World } from './world.js'
import { laneX, LANES } from './worldgen.js'
import { Digger } from './digging.js'
import { applyLook } from './look.js'
import { makeAnimal, ANIMALS } from './animals.js'
import { Bot, BotView } from './bots.js'
import { Round } from './round.js'
import { nextDrill, buyDrill, buyBomb, BOMB_COST, MAX_BOMBS } from './shop.js'
import { Bombs } from './bombs.js'
import { DAZE } from './blast.js'
import { Hud, showResults, showAnimals, clickToPlay } from './ui/hud.js'
import { portrait } from './ui/portrait.js'
import * as meta from './meta.js'
import { Sound } from './audio.js'
import { addCrosshair } from './ui/crosshair.js'

const NAMES = ['Mo', 'Bev', 'Hami', 'Digby', 'Chomp', 'Nibbles', 'Rocky', 'Pip', 'Gizmo', 'Burrow', 'Dusty', 'Nugget']

export function start(platform = null) {
  platform = platform || { name: 'web', loadingStart() {}, loadingStop() {}, gameplayStart() {}, gameplayStop() {},
    happytime() {}, midgameAd: () => Promise.resolve('none'), storage: localStorage, onMute() {} }
  platform.loadingStart()
  const q = new URLSearchParams(location.search)
  const seed = +q.get('seed') || Math.floor(Math.random() * 1e6)
  const speed = +q.get('speed') || 1
  const limit = +q.get('limit') || 300

  const save = meta.load(platform.storage)
  const noa = createEngine({ playerStart: [laneX(0), 1, 0.5] })
  registerBlocks(noa)
  const world = new World(seed).attach(noa)
  const sound = new Sound()
  // the site's sound switch and the M key both mute; either one is enough
  let siteMuted = false, userMuted = false
  const applyMute = () => sound.setMuted(siteMuted || userMuted)
  platform.onMute(m => { siteMuted = m; applyMute() })
  const digger = new Digger(noa, {
    world,
    onCrack: (stage, b) => sound.play('crack', b.hard),
    onBreak: e => { sound.play('break', e.block.hard); if (e.coins) sound.play('coin', e.coins) },
  })
  digger.enabled = false
  // the chosen animal's perk
  const perk = meta.perk(save.chosen)
  digger.digSpeed = perk.digSpeed
  digger.coinMult = perk.coinMult
  digger.bombs = perk.startBombs
  digger.stock = perk.startStock
  applyLook(noa)
  addCrosshair()

  // five bots, names drawn from the list, skills spread so the race is close
  let rnd = seed
  const r = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647
  const names = [...NAMES].sort(() => r() - 0.5).slice(0, LANES - 1)
  const kinds = Object.keys(ANIMALS)
  const bots = names.map((name, i) => new Bot(world, i + 1,
    { name, kind: kinds[i % kinds.length], skill: 0.72 + r() * 0.22, pause: 0.15 + r() * 0.15 }))
  const views = bots.map(b => new BotView(noa, b, makeAnimal))

  // bombs: anyone near a blast is thrown up and dazed; the thrower's ore pays them
  let dazed = 0
  const playerBody = noa.entities.getPhysics(noa.playerEntity).body
  const bombs = new Bombs(noa, world, {
    onFuse: () => sound.play('fuse'),
    onBlast: e => {
      if (e.thrower === 'you') { digger.coins += e.coins; if (e.coins) sound.play('coin', e.coins) }
      const p = noa.entities.getPosition(noa.playerEntity)
      sound.play('boom', Math.max(0.15, 1 - Math.hypot(p[0] - e.center[0], p[1] - e.center[1], p[2] - e.center[2]) / 40))
      for (const r of bombs.reach(e.center, [{ pos: p, you: true }, ...bots])) {
        if (r.you) { playerBody.applyImpulse([0, 9, 0]); dazed = DAZE; hud.toast('BOOM! Dazed') }
        else if (r !== e.bot) r.knock()
      }
    },
  })
  for (const b of bots) b.onBlast = e => {
    bombs.show(e.center, e.broken)
    const p = noa.entities.getPosition(noa.playerEntity)
    const near = 1 - Math.hypot(p[0] - e.center[0], p[1] - e.center[1], p[2] - e.center[2]) / 40
    if (near > 0) sound.play('boom', near)
  }

  const me = {
    name: 'You', isPlayer: true,
    pos() { return noa.entities.getPosition(noa.playerEntity) },
    depth() { return Math.max(0, -Math.floor(this.pos()[1] + 1e-6)) },
    finished() {
      const p = this.pos(), st = playerState(noa)
      return st.onGround && world.get(Math.floor(p[0]), Math.floor(p[1] + 1e-6) - 1, Math.floor(p[2])) === ID.core
    },
  }
  const round = new Round([me, ...bots.map(b => ({ name: b.name, depth: () => b.depth(), finished: () => b.finished }))], { limit })
  const hud = new Hud()
  clickToPlay(() => round.phase !== 'over', noa.container.element)

  round.onPhase = phase => {
    if (phase === 'race') { digger.enabled = true; sound.play('go') }
    if (phase === 'over') {
      digger.enabled = false
      if (document.pointerLockElement) document.exitPointerLock()
      const mine = round.standings().find(x => x.isPlayer)
      const won = mine.place === 1 && mine.finishedAt !== null
      sound.play(won ? 'win' : 'lose')
      platform.gameplayStop()
      if (won) platform.happytime()
      const pay = meta.afterRound(save, mine, digger.coins)
      meta.store(platform.storage, save)
      // Play again: the site's midgame ad (if it shows one), silent, then a new world
      const again = async () => {
        document.querySelectorAll('.overlay .btn').forEach(b => { b.disabled = true })
        sound.setMuted(true)
        await platform.midgameAd()
        q.set('seed', Math.floor(Math.random() * 1e6))
        location.search = q.toString()
      }
      // the results card, and the animal shop from it; back from the shop
      // redraws the card with the coins left after buying
      const openResults = () => {
        // come through the Moon's race portal (row 52): a way back, the winnings already in your coins
        const moon = q.get('from') === 'moon' ? () => { location.href = location.pathname } : null
        const results = showResults(round, again, pay, save.coins, () => {
          results.remove()
          showAnimals(save, meta.SHOP, {
            portrait,
            onBuy: k => { if (meta.buy(save, k)) { meta.choose(save, k); meta.store(platform.storage, save) } },
            onChoose: k => { meta.choose(save, k); meta.store(platform.storage, save) },
            onClose: openResults,
          })
        }, moon)
      }
      openResults()

    }
  }

  // Q throws a bomb where you look; the right button places a block of rubble
  noa.inputs.down.on('mid-fire', () => {
    if (round.phase !== 'race' || dazed > 0) return
    if (digger.bombs <= 0) { hud.toast('No bombs: press 2 to buy one'); sound.play('denied'); return }
    digger.bombs--
    sound.play('thrown')
    const p = noa.entities.getPosition(noa.playerEntity), d = noa.camera.getDirection()
    bombs.throw([p[0] + d[0] * 0.6, p[1] + 1.3, p[2] + d[2] * 0.6], d)
  })
  noa.inputs.down.on('alt-fire', () => {
    const t = noa.targetedBlock
    if (round.phase !== 'race' || !t) return
    if (digger.stock <= 0) { hud.toast('No blocks: dig some rock first'); sound.play('denied'); return }
    const [x, y, z] = t.adjacent
    const inIt = r => Math.floor(r[0]) === x && Math.floor(r[2]) === z && y >= Math.floor(r[1]) && y <= Math.floor(r[1]) + 1
    if (inIt(noa.entities.getPosition(noa.playerEntity)) || bots.some(b => inIt(b.pos))) return
    world.set(x, y, z, ID.rubble)
    digger.stock--
    sound.play('place')
  })

  // M: sound on and off, any time
  window.addEventListener('keydown', e => {
    if (e.code !== 'KeyM') return
    userMuted = !userMuted
    applyMute()
    hud.toast(userMuted ? 'Sound off' : 'Sound on')
  })

  // the shop: 1 for the next drill, 2 for a bomb, any time in the race
  window.addEventListener('keydown', e => {
    if (round.phase !== 'race') return
    if (e.code === 'Digit1') {
      const next = nextDrill(digger)
      if (buyDrill(digger)) { hud.toast(`Drill Lv${digger.drillLevel}!`); sound.play('buy') }
      else { hud.toast(next ? `Need ${next.cost} coins` : 'Drill is maxed'); sound.play('denied') }
    }
    if (e.code === 'Digit2') {
      if (buyBomb(digger)) { hud.toast(`Bomb ${digger.bombs}/${MAX_BOMBS}`); sound.play('buy') }
      else { hud.toast(digger.bombs >= MAX_BOMBS ? 'Bombs full' : `Need ${BOMB_COST} coins`); sound.play('denied') }
    }
  })

  let lastCount = 0, loaded = false
  noa.on('tick', dt => {
    round.tick(dt / 1000)
    if (!loaded) { loaded = true; platform.loadingStop() }
    // the site is told the player is playing exactly while they are: in the
    // race with the mouse in the game
    if (round.phase === 'race' && document.pointerLockElement) platform.gameplayStart()
    else platform.gameplayStop()
    if (round.phase === 'countdown' && round.countdown !== lastCount) { lastCount = round.countdown; sound.play('beep') }
    if (dazed > 0) dazed -= dt / 1000
    digger.enabled = round.phase === 'race' && dazed <= 0
    hud.shop(digger, nextDrill(digger), BOMB_COST, MAX_BOMBS)
    if (round.phase === 'race') for (let k = 0; k < speed; k++) for (const b of bots) b.tick(dt / 1000)
    hud.update(round, { coins: digger.coins, depth: me.depth() })
  })
  noa.on('beforeRender', dt => views.forEach(v => v.update(dt)))

  if (import.meta.env.DEV) {
    window.__game = { noa, world, bots, round, digger, me, bombs, save, sound, platform, dazed: () => dazed,
      // stand the player on the Core in their own lane (for tests)
      toCore() {
        const x = Math.floor(laneX(0))
        for (let y = -99; y <= 0; y++) world.set(x, y, 0, 0)
        noa.entities.setPosition(noa.playerEntity, [laneX(0), -98.9, 0.5])
      },
    }
  }
}
