/* Bots: diggers that race the player down their own lane.

   A bot is pure logic over the World (src/world.js), with no noa in it, so
   it digs and falls the same whether its chunks are loaded or not, and the
   whole race can be run headless (tests/bots.mjs). BotView puts an animal
   on it for the screen.

   What a bot does, every tick:
     falling   - drops (gravity 20) until it lands on something solid;
     down      - digs the block under its feet with the same hardness rule
                 as the player, slowed by its skill, with a short pause
                 between blocks (a person aiming);
     side      - lava under it: it tunnels sideways, head-high block first,
                 then walks into the gap, and goes down again as soon as the
                 block below is not lava. If lava blocks that side too it
                 turns to the next one.
   It stops when it stands on the Core. */
import { byId, ID } from './blocks.js'
import { laneX } from './worldgen.js'

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]
const UNBREAKABLE = 50

export class Bot {
  constructor(world, lane, { kind = 'mole', name = 'Bot', skill = 0.85, pause = 0.2, onBreak = () => {} } = {}) {
    this.world = world
    this.lane = lane
    this.kind = kind
    this.name = name
    this.skill = skill           // fraction of the player's base dig speed
    this.pause = pause           // seconds between blocks
    this.speed = 1               // drill multiplier (upgrades)
    this.onBreak = onBreak
    this.pos = [laneX(lane), 1, 0.5]
    this.vy = 0
    this.state = 'down'
    this.dir = lane % 4
    this.sideSteps = 0
    this.stepTo = null           // [x, z] of the cell being walked into
    this.target = null           // block being dug, 'x,y,z'
    this.progress = 0
    this.wait = 0.6 + lane * 0.05
    this.coins = 0
    this.broken = 0
    this.finished = false
    this.digging = false
    this.moving = 0
  }

  cell() { return [Math.floor(this.pos[0]), Math.floor(this.pos[1] + 1e-6), Math.floor(this.pos[2])] }
  solid(x, y, z) { return this.world.get(x, y, z) !== 0 }

  tick(dt) {
    this.digging = false
    this.moving = 0
    if (this.finished) return
    const [cx, cy, cz] = this.cell()

    // falling, or starting to
    if (!this.solid(cx, cy - 1, cz) || this.vy !== 0) {
      let land = cy - 1
      while (!this.solid(cx, land, cz) && land > cy - 200) land--
      this.vy -= 20 * dt
      this.pos[1] += this.vy * dt
      if (this.pos[1] <= land + 1) { this.pos[1] = land + 1; this.vy = 0 }
      return
    }
    const below = this.world.get(cx, cy - 1, cz)
    if (below === ID.core) { this.finished = true; return }
    if (this.wait > 0) { this.wait -= dt; return }

    if (this.state === 'down') {
      if (below === ID.lava) { this.state = 'side'; this.sideSteps = 0; return }
      this.dig(cx, cy - 1, cz, dt)
      return
    }

    // side: tunnel away from lava under the feet. The cell being stepped
    // into is fixed when the step starts: worked out from the bot's own
    // cell, it would move on as soon as the bot crossed into the next one.
    if (!this.stepTo) {
      const [dx, dz] = DIRS[this.dir]
      const nx = cx + dx, nz = cz + dz
      const feet = this.world.get(nx, cy, nz), head = this.world.get(nx, cy + 1, nz)
      if (feet === ID.lava || head === ID.lava || this.sideSteps > 8) { this.dir = (this.dir + 1) % 4; this.sideSteps = 0; return }
      if (head !== 0) { this.dig(nx, cy + 1, nz, dt); return }
      if (feet !== 0) { this.dig(nx, cy, nz, dt); return }
      this.stepTo = [nx, nz]
    }
    const [nx, nz] = this.stepTo
    const tx = nx + 0.5, tz = nz + 0.5
    const step = 3 * dt                                    // three blocks a second
    this.pos[0] += Math.sign(tx - this.pos[0]) * Math.min(step, Math.abs(tx - this.pos[0]))
    this.pos[2] += Math.sign(tz - this.pos[2]) * Math.min(step, Math.abs(tz - this.pos[2]))
    this.moving = 1
    if (Math.abs(tx - this.pos[0]) < 0.01 && Math.abs(tz - this.pos[2]) < 0.01) {
      this.stepTo = null
      this.sideSteps++
      if (this.world.get(nx, cy - 1, nz) !== ID.lava) this.state = 'down'
    }
  }

  dig(x, y, z, dt) {
    const k = `${x},${y},${z}`
    const b = byId[this.world.get(x, y, z)]
    if (!b || b.hard >= UNBREAKABLE) { this.dir = (this.dir + 1) % 4; return }
    if (k !== this.target) { this.target = k; this.progress = 0 }
    this.digging = true
    this.progress += dt / (b.hard / (this.speed * this.skill))
    if (this.progress >= 1) {
      this.world.set(x, y, z, 0)
      this.coins += b.coins
      this.broken++
      this.target = null
      this.progress = 0
      this.wait = this.pause * (0.6 + Math.random() * 0.8)
      this.onBreak({ bot: this, block: b, pos: [x, y, z] })
    }
  }

  depth() { return Math.max(0, -Math.floor(this.pos[1])) }
}

/* A bot on screen: its animal as a noa entity, following the bot, facing
   the way it tunnels, its arm pounding while it digs. */
export class BotView {
  constructor(noa, bot, makeAnimal) {
    this.noa = noa
    this.bot = bot
    this.animal = makeAnimal(noa.rendering.getScene(), bot.kind, bot.name, m => noa.rendering.addMeshToScene(m))
    this.id = noa.entities.add([...bot.pos], 0.6, 1.6, this.animal.root, [0, 0, 0], false, false)
  }
  update(dt) {
    const b = this.bot
    this.noa.entities.setPosition(this.id, [...b.pos])
    if (b.state === 'side') this.animal.root.rotation.y = Math.atan2(DIRS[b.dir][0], DIRS[b.dir][1])
    this.animal.update(dt, b.moving, b.digging)
  }
}
