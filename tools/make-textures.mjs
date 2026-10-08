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
const DIRT = ['#86603f', '#79553a', '#93694a', '#6b4a31', '#a07756']
const GRASS = ['#5aa83c', '#56a239', '#5fae41', '#51993a', '#66b748']
const STONE = ['#8a8a8e', '#7e7e83', '#96969a', '#727277', '#a3a3a7']
const DEEP = ['#4f5566', '#474c5c', '#575d70', '#3f4452', '#626a7e']
const BASALT = ['#2c2628', '#352d2f', '#241f21', '#3d3436']

const T = {}
T.dirt = () => new Tex(1).noise(DIRT).specks(5, ['#5e412b', '#a88063'], 2)
T.grass_top = () => new Tex(2).noise(GRASS, 2.2).specks(4, ['#4a8f33', '#74c457'], 1)
T.grass_side = () => {
  const t = T.dirt()
  const g = new Tex(3).noise(GRASS)
  for (let x = 0; x < N; x++) {
    const d = 3 + Math.floor(g.r() * 3)    // a ragged fringe 3–5 pixels deep
    for (let y = 0; y < d; y++) t.set(x, y, g.get(x, y))
  }
  return t
}
T.stone = () => new Tex(4).noise(STONE).specks(4, ['#66666b'], 3).vein('#6b6b70', 6)
T.deepstone = () => {
  const t = new Tex(5).noise(DEEP)
  for (let y = 2; y < N; y += 5) for (let x = 0; x < N; x++) if (t.r() < 0.7) t.set(x, y, '#3a3e4b')
  return t.specks(3, ['#6e7790'], 1)
}
T.basalt = () => new Tex(6).noise(BASALT).vein('#c2410c', 10).vein('#f97316', 7).specks(3, ['#fbbf24'], 1)
T.lava = () => {
  const t = new Tex(7).noise(['#f97316', '#ea580c', '#fb923c', '#dc2626'], 1.2)
  return t.specks(8, ['#fde047', '#facc15'], 2).specks(4, ['#b91c1c'], 2)
}
T.crystal = () => {
  const t = new Tex(8).noise(['#6d4bd8', '#7c5ce6', '#5b3dc0', '#8b6cf0'])
  for (let k = 0; k < 4; k++) t.vein('#c4b5fd', 5)
  return t.specks(5, ['#e9d5ff', '#ffffff'], 1)
}
T.coal_ore = () => T.stone().ore(4, '#2b2b2e', '#4a4a4f', '#18181a')
T.iron_ore = () => T.stone().ore(4, '#d8a77a', '#efc9a3', '#a8724a')
T.gold_ore = () => T.deepstone().ore(4, '#f5c518', '#fff1a1', '#b8860b')
T.gem_ore = () => T.deepstone().ore(4, '#2dd4bf', '#a7f3eb', '#0f766e')
T.log_side = () => {
  const t = new Tex(12).noise(['#6b4a2b', '#5e4026', '#7a5533', '#523720'])
  for (let x = 1; x < N; x += 3) for (let y = 0; y < N; y++) if (t.r() < 0.75) t.set(x, y, '#4a311c')
  return t
}
T.log_top = () => {
  const t = new Tex(13).noise(['#b08a5a', '#a37d4f', '#bb9665'])
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5)
    if (d > 7) t.set(x, y, '#5e4026'); else if (Math.round(d) % 3 === 0) t.set(x, y, '#8a6a40')
  }
  return t
}
T.leaves = () => new Tex(14).noise(['#3f8f2f', '#357d28', '#4aa236', '#2c6a22', '#5bb544'], 1.3).specks(6, ['#245a1c'], 2)
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
