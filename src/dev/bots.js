/* Dev: bots. The player in lane 0 and five bots in lanes 1-5, all on the
   real World. ?dev=bots&speed=4 runs the bots four times as fast.
   window.__dev.follow(i) floats the player in bot i's shaft, 3 blocks
   above it, looking down. */
import { createEngine, playerState } from '../engine.js'
import { registerBlocks } from '../blocks.js'
import { World } from '../world.js'
import { laneX } from '../worldgen.js'
import { Digger } from '../digging.js'
import { applyLook } from '../look.js'
import { makeAnimal } from '../animals.js'
import { Bot, BotView } from '../bots.js'
import { addCrosshair } from '../ui/crosshair.js'
import { devHud } from './hud.js'

export function start() {
  const speed = +new URLSearchParams(location.search).get('speed') || 1
  const noa = createEngine({ playerStart: [laneX(0), 1, 0.5] })
  registerBlocks(noa)
  const world = new World(42).attach(noa)
  const digger = new Digger(noa, { world })
  applyLook(noa)
  addCrosshair()
  const crew = [['mole', 'Mo', 0.95], ['beaver', 'Bev', 0.9], ['hamster', 'Hami', 0.85], ['mole', 'Digby', 0.8], ['beaver', 'Chomp', 0.75]]
  const bots = crew.map(([kind, name, skill], i) => new Bot(world, i + 1, { kind, name, skill }))
  const views = bots.map(b => new BotView(noa, b, makeAnimal))
  let following = -1
  const body = noa.entities.getPhysics(noa.playerEntity).body
  noa.on('tick', dt => {
    for (let k = 0; k < speed; k++) for (const b of bots) b.tick(dt / 1000)
    if (following >= 0) {
      const b = bots[following]
      noa.entities.setPosition(noa.playerEntity, [b.pos[0], b.pos[1] + 3, b.pos[2]])
      body.velocity = [0, 0, 0]
    }
  })
  noa.on('beforeRender', dt => views.forEach(v => v.update(dt)))
  const follow = i => { following = i; body.gravityMultiplier = i >= 0 ? 0 : 1; noa.camera.pitch = 1.45 }
  devHud(() => bots.map(b => `${b.name.padEnd(6)} y ${b.pos[1].toFixed(0).padStart(4)} ${b.state}${b.finished ? ' DONE' : ''}`).join('\n'))
  window.__dev = { noa, world, bots, views, digger, follow, state: () => playerState(noa) }
}
