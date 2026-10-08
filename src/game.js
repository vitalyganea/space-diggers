/* The game: one round of Boom Diggers. You in lane 0, five bots in the
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
import { Hud, showResults, clickToPlay } from './ui/hud.js'
import { addCrosshair } from './ui/crosshair.js'

const NAMES = ['Mo', 'Bev', 'Hami', 'Digby', 'Chomp', 'Nibbles', 'Rocky', 'Pip', 'Gizmo', 'Burrow', 'Dusty', 'Nugget']

export function start() {
  const q = new URLSearchParams(location.search)
  const seed = +q.get('seed') || Math.floor(Math.random() * 1e6)
  const speed = +q.get('speed') || 1
  const limit = +q.get('limit') || 300

  const noa = createEngine({ playerStart: [laneX(0), 1, 0.5] })
  registerBlocks(noa)
  const world = new World(seed).attach(noa)
  const digger = new Digger(noa, { world })
  digger.enabled = false
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
    onBlast: e => {
      if (e.thrower === 'you') digger.coins += e.coins
      const p = noa.entities.getPosition(noa.playerEntity)
      for (const r of bombs.reach(e.center, [{ pos: p, you: true }, ...bots])) {
        if (r.you) { playerBody.applyImpulse([0, 9, 0]); dazed = DAZE; hud.toast('BOOM! Dazed') }
        else if (r !== e.bot) r.knock()
      }
    },
  })
  for (const b of bots) b.onBlast = e => bombs.show(e.center, e.broken)

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
    if (phase === 'race') digger.enabled = true
    if (phase === 'over') {
      digger.enabled = false
      if (document.pointerLockElement) document.exitPointerLock()
      showResults(round, () => {
        q.set('seed', Math.floor(Math.random() * 1e6))
        location.search = q.toString()
      })
    }
  }

  // Q throws a bomb where you look; the right button places a block of rubble
  noa.inputs.down.on('mid-fire', () => {
    if (round.phase !== 'race' || dazed > 0) return
    if (digger.bombs <= 0) { hud.toast('No bombs: press 2 to buy one'); return }
    digger.bombs--
    const p = noa.entities.getPosition(noa.playerEntity), d = noa.camera.getDirection()
    bombs.throw([p[0] + d[0] * 0.6, p[1] + 1.3, p[2] + d[2] * 0.6], d)
  })
  noa.inputs.down.on('alt-fire', () => {
    const t = noa.targetedBlock
    if (round.phase !== 'race' || !t) return
    if (digger.stock <= 0) { hud.toast('No blocks: dig some rock first'); return }
    const [x, y, z] = t.adjacent
    const inIt = r => Math.floor(r[0]) === x && Math.floor(r[2]) === z && y >= Math.floor(r[1]) && y <= Math.floor(r[1]) + 1
    if (inIt(noa.entities.getPosition(noa.playerEntity)) || bots.some(b => inIt(b.pos))) return
    world.set(x, y, z, ID.rubble)
    digger.stock--
  })

  // the shop: 1 for the next drill, 2 for a bomb, any time in the race
  window.addEventListener('keydown', e => {
    if (round.phase !== 'race') return
    if (e.code === 'Digit1') {
      const next = nextDrill(digger)
      if (buyDrill(digger)) hud.toast(`Drill Lv${digger.drillLevel}!`)
      else hud.toast(next ? `Need ${next.cost} coins` : 'Drill is maxed')
    }
    if (e.code === 'Digit2') {
      if (buyBomb(digger)) hud.toast(`Bomb ${digger.bombs}/${MAX_BOMBS}`)
      else hud.toast(digger.bombs >= MAX_BOMBS ? 'Bombs full' : `Need ${BOMB_COST} coins`)
    }
  })

  noa.on('tick', dt => {
    round.tick(dt / 1000)
    if (dazed > 0) dazed -= dt / 1000
    digger.enabled = round.phase === 'race' && dazed <= 0
    hud.shop(digger, nextDrill(digger), BOMB_COST, MAX_BOMBS)
    if (round.phase === 'race') for (let k = 0; k < speed; k++) for (const b of bots) b.tick(dt / 1000)
    hud.update(round, { coins: digger.coins, depth: me.depth() })
  })
  noa.on('beforeRender', dt => views.forEach(v => v.update(dt)))

  if (import.meta.env.DEV) {
    window.__game = { noa, world, bots, round, digger, me, bombs, dazed: () => dazed,
      // stand the player on the Core in their own lane (for tests)
      toCore() {
        const x = Math.floor(laneX(0))
        for (let y = -99; y <= 0; y++) world.set(x, y, 0, 0)
        noa.entities.setPosition(noa.playerEntity, [laneX(0), -98.9, 0.5])
      },
    }
  }
}
