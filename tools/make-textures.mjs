/* make-textures.mjs: every block texture, 16×16 pixel art, into public/tex/.

     node tools/make-textures.mjs

   Each texture is drawn from its own palette with seeded noise, so the
   output is the same every run, and nothing is copied from another game.
   No dependencies: a minimal PNG encoder on node's zlib. */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const N = 16
const OUT = new URL('../public/tex/', import.meta.url)

/* ---------------------------------------------------------------- PNG */
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(px) { return pngWH(px, N, N) }   // px: Uint8Array of N*N*4 RGBA
function pngWH(px, W, H) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 6       // 8-bit RGBA
  const raw = Buffer.alloc(H * (W * 4 + 1))
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0
    Buffer.from(px.buffer, px.byteOffset + y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1)
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

/* ------------------------------------------------------------- drawing */
function rng(seed) {             // mulberry32
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

class Tex {
  constructor(seed) { this.px = new Uint8Array(N * N * 4); this.r = rng(seed) }
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= N || y >= N) return
    const i = (y * N + x) * 4, [r, g, b] = typeof c === 'string' ? hex(c) : c
    this.px[i] = r; this.px[i + 1] = g; this.px[i + 2] = b; this.px[i + 3] = 255
  }
  /* a pixel with its own alpha, for the transparent crack overlays */
  setA(x, y, c, a) { this.set(x, y, c); if (x >= 0 && y >= 0 && x < N && y < N) this.px[(y * N + x) * 4 + 3] = a }
  get(x, y) { const i = (y * N + x) * 4; return [this.px[i], this.px[i + 1], this.px[i + 2]] }
  /* every pixel a pick from the palette, weighted towards the first */
  noise(pal, bias = 1.6) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
      this.set(x, y, pal[Math.min(pal.length - 1, Math.floor(Math.pow(this.r(), bias) * pal.length))])
    return this
  }
  /* a few blobs of 1–3 pixels in a colour, for specks and ore */
  specks(n, cols, size = 2) {
    for (let k = 0; k < n; k++) {
      const x = Math.floor(this.r() * N), y = Math.floor(this.r() * N)
      const s = 1 + Math.floor(this.r() * size)
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++)
        if (this.r() < 0.85) this.set(x + i, y + j, cols[Math.floor(this.r() * cols.length)])
    }
    return this
  }
  /* ore: clusters with a light top-left pixel and a dark bottom-right one,
     so they read as lumps set in the rock */
  ore(n, mid, light, dark) {
    for (let k = 0; k < n; k++) {
      const cx = 2 + Math.floor(this.r() * 12), cy = 2 + Math.floor(this.r() * 12)
      const cells = [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]].filter(() => this.r() < 0.8)
      for (const [i, j] of cells) this.set(cx + i, cy + j, mid)
      this.set(cx, cy, light)
      this.set(cx + 1, cy + 1, dark)
    }
    return this
  }
  /* a jagged line, for cracks and lava veins */
  vein(col, len, x = Math.floor(this.r() * N), y = Math.floor(this.r() * N)) {
    for (let k = 0; k < len; k++) {
      this.set(x, y, col)
      x += Math.floor(this.r() * 3) - 1; y += this.r() < 0.6 ? 1 : 0
      if (y >= N) y = 0
      x = (x + N) % N
    }
    return this
  }
}

/* ------------------------------------------------------------ palettes */
// Space Diggers (row 26): the Moon's ground, its ores, and the space base
const REGOLITH = ['#a9a8a3', '#9f9e99', '#b4b3ae', '#94938e', '#bebdb8']
const DUST = ['#8b8780', '#827e77', '#96928a', '#77736c', '#a19d95']
const ROCK = ['#76777e', '#6c6d74', '#80818a', '#62636a', '#8b8c95']
const DARK = ['#3f4558', '#394052', '#474e63', '#323848', '#525a71']
const BASALT = ['#26252c', '#2e2d35', '#1f1e24', '#37353f']

/* a little crater: a dark bowl with a light rim on the side the sun is on */
function crater(t, cx, cy, r) {
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
    const d = Math.hypot(x, y)
    if (d <= r - 0.5) t.set(cx + x, cy + y, x + y > 0 ? '#7f7e79' : '#8c8b86')
    else if (d <= r + 0.6) t.set(cx + x, cy + y, x + y < 0 ? '#d2d1cc' : '#868580')
  }
}
/* a four-pointed star, for star gems */
function star(t, cx, cy, mid, tip) {
  t.set(cx, cy, '#ffffff')
  for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { t.set(cx + i, cy + j, mid); t.set(cx + 2 * i, cy + 2 * j, tip) }
}

const T = {}
T.dust = () => new Tex(1).noise(DUST).specks(5, ['#6a665f', '#b0aca3'], 2)
T.regolith_top = () => {
  const t = new Tex(2).noise(REGOLITH, 2).specks(5, ['#8a8984', '#c9c8c3'], 1)
  crater(t, 4, 5, 2); crater(t, 11, 11, 1.4); crater(t, 12, 3, 1)
  return t
}
T.regolith_side = () => {
  const t = T.dust()
  const g = new Tex(3).noise(REGOLITH)
  for (let x = 0; x < N; x++) {
    const d = 2 + Math.floor(g.r() * 3)    // a ragged layer of loose dust 2–4 pixels deep
    for (let y = 0; y < d; y++) t.set(x, y, g.get(x, y))
  }
  return t
}
T.moonrock = () => new Tex(4).noise(ROCK).specks(4, ['#5a5b62'], 3).vein('#595a61', 6).specks(3, ['#9a9ba4'], 1)
T.darkrock = () => {
  const t = new Tex(5).noise(DARK)
  for (let y = 2; y < N; y += 5) for (let x = 0; x < N; x++) if (t.r() < 0.7) t.set(x, y, '#2c3141')
  return t.specks(3, ['#6b7594'], 1)
}
T.basalt = () => new Tex(6).noise(BASALT).vein('#3b3946', 8).specks(4, ['#6d5bd0', '#8f7cf0'], 1)   // glints of glassy rock
T.lava = () => {
  const t = new Tex(7).noise(['#f97316', '#ea580c', '#fb923c', '#dc2626'], 1.2)
  return t.specks(8, ['#fde047', '#facc15'], 2).specks(4, ['#b91c1c'], 2)
}
T.crystal = () => {
  const t = new Tex(8).noise(['#6d4bd8', '#7c5ce6', '#5b3dc0', '#8b6cf0'])
  for (let k = 0; k < 4; k++) t.vein('#c4b5fd', 5)
  return t.specks(5, ['#e9d5ff', '#ffffff'], 1)
}
T.copper_ore = () => T.moonrock().ore(4, '#d9773a', '#f6ad73', '#8a4115')
T.titanium_ore = () => T.moonrock().ore(4, '#cbd5e1', '#ffffff', '#64748b')
T.gold_ore = () => T.darkrock().ore(4, '#f5c518', '#fff1a1', '#b8860b')
T.stargem_ore = () => {
  const t = T.darkrock()
  star(t, 4, 4, '#f472b6', '#9d174d'); star(t, 11, 7, '#38bdf8', '#075985'); star(t, 5, 12, '#f472b6', '#9d174d')
  return t
}
T.helium_ore = () => {
  const t = T.darkrock()
  for (let k = 0; k < 3; k++) t.vein('#4ade80', 6)
  return t.specks(5, ['#bbf7d0', '#86efac'], 2)
}
T.ice = () => {
  const t = new Tex(12).noise(['#9fd3f0', '#8ec8ea', '#b2e0f6', '#7fbde4'], 1.3)
  for (let k = 0; k < 3; k++) t.vein('#e0f4ff', 6)
  return t.specks(4, ['#ffffff'], 1)
}
T.frost = () => new Tex(14).noise(['#e3f0f9', '#d4e8f5', '#eef6fc', '#c6e0f2'], 1.4).specks(6, ['#ffffff', '#b9d8ee'], 1)
T.rubble = () => {
  const t = new Tex(15).noise(['#7a7a80', '#6e6e74', '#86868c', '#606066'])
  for (let k = 0; k < 7; k++) {                    // broken rock with dark joints between
    const x = Math.floor(t.r() * 13), y = Math.floor(t.r() * 13)
    for (let i = 0; i < 4; i++) { t.set(x + i, y, '#45454b'); t.set(x, y + i, '#45454b') }
  }
  return t
}
// the space base (row 28 builds it)
/* a square metal panel: `pal` noise, a dark seam round the edge, a rivet in each corner */
function panel(seed, pal, seam, rivet) {
  const t = new Tex(seed).noise(pal, 1.6)
  for (let i = 0; i < N; i++) { t.set(i, 15, seam); t.set(15, i, seam) }
  for (let i = 0; i < N; i++) { t.set(i, 0, rivet === '#ffffff' ? '#f1f5f9' : pal[2]) }
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) t.set(x, y, rivet)
  return t
}
T.floor = () => {                                   // tread plate: raised diagonal dashes
  const t = panel(20, ['#6b7280', '#656c79', '#737b88'], '#3f4550', '#9ca3af')
  for (let y = 1; y < 15; y += 3) for (let x = (y % 2) + 1; x < 15; x += 4) { t.set(x, y, '#8b93a1'); t.set(x + 1, y + 1, '#4b515d') }
  return t
}
T.hull = () => {                                    // the white wall panels of the base
  const t = panel(21, ['#dde3ea', '#d3dae2', '#e6eaef', '#c9d1da'], '#8b95a3', '#9aa4b2')
  for (let x = 0; x < N; x++) t.set(x, 7, '#b8c1cc')
  return t
}
T.solar = () => {                                   // roof: solar cells in a silver frame
  const t = new Tex(22).noise(['#1e3a8a', '#1d4ed8', '#1e40af', '#2348b8'], 1.4)
  for (let i = 0; i < N; i++) for (const k of [0, 5, 10, 15]) { t.set(i, k, '#c0c7d1'); t.set(k, i, '#c0c7d1') }
  for (let k = 0; k < 3; k++) t.set(2 + k, 2 + k, '#60a5fa')                              // a glint
  return t
}
T.glass = () => {                                   // dome glass: a pale blue with a bright frame
  const t = new Tex(23).noise(['#7fb6d8', '#76aed2', '#89bfdf'], 1.2)
  for (let i = 0; i < N; i++) { t.set(i, 0, '#e2e8f0'); t.set(i, 15, '#e2e8f0'); t.set(0, i, '#e2e8f0'); t.set(15, i, '#e2e8f0') }
  for (let k = 0; k < 4; k++) t.set(3 + k, 3 + k, '#f0f9ff')
  return t
}
T.deck = () => {                                    // the base's ground: dark plates with seams
  const t = new Tex(24).noise(['#454c58', '#3e4550', '#4c5360', '#393f4a'], 1.4)
  for (let i = 0; i < N; i++) { t.set(i, 7, '#2b3039'); t.set(7, i, '#2b3039'); t.set(i, 15, '#2b3039'); t.set(15, i, '#2b3039') }
  for (const [x, y] of [[2, 2], [10, 2], [2, 10], [10, 10]]) t.set(x, y, '#6b7280')
  return t
}
T.meteorite = () => {                               // black rock with glowing cracks
  const t = new Tex(29).noise(['#16141a', '#1d1a22', '#110f14', '#25212b'], 1.4)
  for (let k = 0; k < 4; k++) t.vein('#f97316', 6)
  return t.specks(4, ['#fbbf24'], 1).specks(3, ['#3b3542'], 2)
}
T.meteor_ore = () => {                              // and lumps of shining meteoric iron in it
  const t = T.meteorite()
  t.ore(4, '#a5b4c8', '#f1f5f9', '#475569')
  return t.specks(4, ['#c4b5fd', '#99f6e4'], 1)       // a shimmer of colour on the metal
}
// the Ice Moon (row 58)
const SNOW = ['#f3f8fc', '#e8f1f8', '#fbfdff', '#dde9f3', '#ffffff']
T.snow_top = () => new Tex(31).noise(SNOW, 1.6).specks(6, ['#cfe2f1', '#ffffff'], 1)
T.packed_ice = () => {
  const t = new Tex(32).noise(['#6fa8dc', '#6399cf', '#7bb4e3', '#5a8fc6'], 1.4)
  for (let k = 0; k < 4; k++) t.vein('#a7d0f0', 6)
  return t.specks(3, ['#d6ecfb'], 1)
}
T.snow_side = () => {
  const t = T.packed_ice(), g = new Tex(33).noise(SNOW)
  for (let x = 0; x < N; x++) { const d = 3 + Math.floor(g.r() * 3); for (let y = 0; y < d; y++) t.set(x, y, g.get(x, y)) }
  return t
}
T.coldsilver_ore = () => T.packed_ice().ore(4, '#e2e8f0', '#ffffff', '#94a3b8')
T.frostgem_ore = () => {
  const t = T.packed_ice()
  for (const [cx, cy] of [[4, 5], [11, 9], [6, 12]]) {
    for (const [i, j] of [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]) t.set(cx + i, cy + j, '#2563eb')
    t.set(cx, cy, '#e0f2fe'); t.set(cx - 1, cy - 1, '#93c5fd')
  }
  return t
}
T.charger = () => {                                 // the charging pad: a dark plate, a glowing ring and a bolt
  const t = new Tex(27).noise(['#1f2937', '#232d3d', '#1b2431'], 1.4)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5)
    if (d > 5.6 && d < 7.2) t.set(x, y, d < 6.4 ? '#22d3ee' : '#a5f3fc')
  }
  for (const [x, y] of [[8, 3], [7, 4], [8, 4], [6, 5], [7, 5], [5, 6], [6, 6], [7, 7], [8, 7], [9, 7], [10, 7], [8, 8], [9, 8], [7, 9], [8, 9], [6, 10], [7, 10], [6, 11], [5, 12]])
    t.set(x, y, '#fde047')
  return t
}
for (const [name, col, glow] of [['green', '#2fbf71', '#a7f3d0'], ['red', '#e63946', '#fecaca'], ['blue', '#3b82f6', '#bfdbfe'],
  ['yellow', '#f5c518', '#fef9c3'], ['purple', '#8b5cf6', '#ddd6fe']]) {
  T['light_' + name] = () => {                      // a lit sign band over a door
    const t = new Tex(25)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) t.set(x, y, col)
    for (let x = 0; x < N; x++) { t.set(x, 0, '#2b3039'); t.set(x, 15, '#2b3039'); t.set(x, 7, glow); t.set(x, 8, glow) }
    for (let x = 1; x < N; x += 4) for (let y = 3; y < 13; y++) if (y < 7 || y > 8) t.set(x, y, glow)
    return t
  }
}
T.portal = () => {
  const t = new Tex(26).noise(['#6d28d9', '#7c3aed', '#5b21b6', '#8b5cf6'], 1.2)
  for (let k = 0; k < 5; k++) t.vein('#c4b5fd', 8)
  return t.specks(6, ['#ffffff', '#e9d5ff'], 1)
}
T.core = () => {
  const t = new Tex(9).noise(['#fbbf24', '#f59e0b', '#fcd34d'], 1.3)
  for (let i = 0; i < N; i++) { t.set(i, i, '#ec4899'); t.set(N - 1 - i, i, '#ec4899') }
  for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) t.set(x, y, '#ffffff')
  return t.specks(6, ['#fef3c7'], 1)
}

/* Cracks for the block being dug, stage 1 (a hairline) to 5 (shattered):
   transparent but for thin dark lines that run out from the middle, more
   and longer at each stage, each stage drawn over the last. */
const CRACKS = []
{
  const t = new Tex(11); t.px.fill(0)
  const rays = [0.3, 2.2, 4.1, 1.2, 5.3, 3.0, 0.8, 4.7].map(a => ({ a, x: 7.5, y: 7.5 }))
  for (let stage = 1; stage <= 5; stage++) {
    for (const ray of rays.slice(0, Math.min(rays.length, stage + 2))) {
      for (let k = 0; k < 2; k++) {                  // two more pixels per ray per stage
        ray.a += (t.r() - 0.5) * 0.7
        ray.x += Math.cos(ray.a) * 1.1; ray.y += Math.sin(ray.a) * 1.1
        t.setA(Math.round(ray.x), Math.round(ray.y), '#1a1410', 225)
      }
    }
    CRACKS.push(new Uint8Array(t.px))
  }
}

mkdirSync(OUT, { recursive: true })
// the atlas: every block texture stacked top to bottom, in src/blocks.js's order
{
  const { ATLAS } = await import('../src/blocks.js')
  const made = Object.fromEntries(ATLAS.map(n => [n, T[n]().px]))
  const strip = new Uint8Array(N * N * 4 * ATLAS.length)
  ATLAS.forEach((n, i) => strip.set(made[n], i * N * N * 4))
  writeFileSync(new URL('atlas.png', OUT), pngWH(strip, N, N * ATLAS.length))
  console.log(`public/tex/atlas.png (${ATLAS.length} textures)`)
}
CRACKS.forEach((px, i) => { writeFileSync(new URL(`crack_${i + 1}.png`, OUT), png(px)); console.log(`public/tex/crack_${i + 1}.png`) })
for (const [name, make] of Object.entries(T)) {
  writeFileSync(new URL(name + '.png', OUT), png(make().px))
  console.log('public/tex/' + name + '.png')
}
