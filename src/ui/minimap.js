/* The minimap and the depth meter, top right.

   The map is a slice through the World at the level of your feet, seen
   from above, RANGE blocks each way: rock in its own colour, open space
   (your tunnels, caves, the open air) dark. The town's buildings are
   coloured squares with a letter; if the town is off the map an arrow at
   the edge points home. You are the white arrow, turned the way you look.

   The meter beside it is the way down through the Moon to the Core, its layers coloured,
   with a marker where you are. Redrawn five times a second. */
import { byId, ID } from '../blocks.js'
import { BUILDINGS, PORTAL, PAD } from '../town.js'
import { MOON, CORE_Y } from '../worldgen.js'

const RANGE = 24
const PX = 4                                  // pixels per block
const SIZE = (RANGE * 2 + 1) * PX
const COLORS = {
  [ID.regolith]: '#b4b3ae', [ID.dust]: '#8b8780', [ID.moonrock]: '#76777e', [ID.darkrock]: '#454c62', [ID.basalt]: '#2e2d35',
  [ID.lava]: '#f97316', [ID.crystal]: '#7c5ce6', [ID.copper_ore]: '#d9773a', [ID.titanium_ore]: '#e2e8f0', [ID.gold_ore]: '#f5c518',
  [ID.stargem_ore]: '#f472b6', [ID.helium_ore]: '#4ade80', [ID.core]: '#fbbf24', [ID.ice]: '#9fd3f0', [ID.frost]: '#e3f0f9',
  [ID.rubble]: '#7a7a80', [ID.deck]: '#454c58', [ID.floor]: '#6b7280', [ID.hull]: '#dde3ea',
}
const SHOP_COLORS = { market: '#2fbf71', workshop: '#f5c518', bombs: '#e63946', museum: '#3b82f6', robots: '#8b5cf6', portal: '#a78bfa', pad: '#e5e7eb' }
const BAND = [['Dust', 0, MOON.dust, '#8b8780'], ['Moon rock', MOON.dust, MOON.rock, '#76777e'], ['Dark rock', MOON.rock, MOON.dark, '#454c62'],
  ['Ice caves', MOON.dark, MOON.ice, '#7fbde4'], ['Crystal', MOON.ice, MOON.crystal, '#7c5ce6'], ['Core', MOON.crystal, CORE_Y - 2, '#fbbf24']]

export class Minimap {
  constructor(world) {
    this.world = world
    this.el = document.createElement('div')
    this.el.className = 'hud minimap'
    this.el.innerHTML = `<div class="meter panel"><div class="bands"></div><i class="you"></i></div>
      <div class="map panel"><canvas width="${SIZE}" height="${SIZE}"></canvas><div class="where"></div></div>`
    document.body.appendChild(this.el)
    this.canvas = this.el.querySelector('canvas')
    this.g = this.canvas.getContext('2d')
    const total = -(CORE_Y - 2)
    this.el.querySelector('.bands').innerHTML = BAND.map(([name, top, bottom, col]) =>
      `<div style="height:${100 * (top - bottom) / total}%;background:${col}" title="${name}"><span>${name}</span></div>`).join('')
    this.t = 0
  }

  /* extra: { robot: [x, y, z] | null, ping: [x, y, z] | null } */
  update(dt, pos, heading, extra = {}) {
    this.t += dt
    if (this.t < 0.2) return
    this.t = 0
    const g = this.g, w = this.world
    const px = Math.floor(pos[0]), pz = Math.floor(pos[2]), py = Math.floor(pos[1] + 1e-6)
    g.fillStyle = '#0d0f16'
    g.fillRect(0, 0, SIZE, SIZE)
    // the slice at your feet (the block under them where you stand on it)
    for (let i = -RANGE; i <= RANGE; i++) for (let j = -RANGE; j <= RANGE; j++) {
      let id = w.get(px + i, py, pz + j)
      if (id === 0) { const under = w.get(px + i, py - 1, pz + j); if (under !== 0 && py >= 0) id = under }
      if (id === 0) continue
      const solid = w.get(px + i, py, pz + j) !== 0
      g.fillStyle = COLORS[id] || '#777'
      g.globalAlpha = solid ? 1 : 0.45
      g.fillRect((i + RANGE) * PX, (j + RANGE) * PX, PX, PX)
    }
    g.globalAlpha = 1
    // the town: a square per building, or an arrow home at the edge
    const c = SIZE / 2
    let townSeen = false
    for (const b of [...BUILDINGS, PORTAL, PAD]) {
      const x = (b.at[0] - px + RANGE) * PX, z = (b.at[1] - pz + RANGE) * PX
      if (x < 0 || z < 0 || x > SIZE || z > SIZE) continue
      townSeen = true
      g.fillStyle = SHOP_COLORS[b.key]
      g.fillRect(x - 6, z - 6, 12, 12)
      g.fillStyle = b.key === 'pad' ? '#111' : '#fff'; g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(b.name[0], x, z + 1)
    }
    if (!townSeen) {
      const a = Math.atan2(-pz, -px), r = c - 10
      g.save(); g.translate(c + Math.cos(a) * r, c + Math.sin(a) * r); g.rotate(a)
      g.fillStyle = '#f5c518'; g.beginPath(); g.moveTo(8, 0); g.lineTo(-6, -6); g.lineTo(-6, 6); g.fill(); g.restore()
    }
    // your robot (cyan) and what Sonar felt (a gold ring)
    const dot = (q, col, r, ring) => {
      if (!q) return
      const x = (q[0] - px + RANGE) * PX, z = (q[2] - pz + RANGE) * PX
      if (x < 0 || z < 0 || x > SIZE || z > SIZE) return
      g.beginPath(); g.arc(x, z, r, 0, Math.PI * 2)
      if (ring) { g.strokeStyle = col; g.lineWidth = 2; g.stroke() } else { g.fillStyle = col; g.fill() }
    }
    dot(extra.robot, '#7df9ff', 3.5)
    dot(extra.ping && [extra.ping[0] + 0.5, 0, extra.ping[2] + 0.5], '#f5c518', 6, true)
    // you: noa's heading 0 looks down +z, which is down the map
    g.save(); g.translate(c + PX / 2, c + PX / 2); g.rotate(-heading)
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2
    g.beginPath(); g.moveTo(0, 9); g.lineTo(-6, -6); g.lineTo(0, -3); g.lineTo(6, -6); g.closePath(); g.stroke(); g.fill(); g.restore()
    // the meter
    const depth = Math.max(0, -py)
    this.el.querySelector('.you').style.top = `${Math.min(100, 100 * depth / -(CORE_Y - 2))}%`
    this.el.querySelector('.where').textContent = py >= 0 ? 'Surface' : `${depth} m down`
  }
}
