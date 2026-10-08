/* System 2 check: every block's textures exist and are 16x16 PNGs, and the
   generator is deterministic (two runs, same bytes).   node tests/textures.mjs */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { BLOCKS } from '../src/blocks.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const dir = new URL('../public/tex/', import.meta.url)
const names = [...new Set(BLOCKS.flatMap(b => [].concat(b.tex)))]
const before = names.map(n => readFileSync(new URL(n + '.png', dir)))
for (const [i, n] of names.entries()) {
  const b = before[i]
  ok(b.readUInt32BE(16) === 16 && b.readUInt32BE(20) === 16, `${n}.png is 16x16`)
}
execFileSync('node', [new URL('../tools/make-textures.mjs', import.meta.url).pathname])
ok(names.every((n, i) => readFileSync(new URL(n + '.png', dir)).equals(before[i])), 'regenerating gives the same files')
ok(new Set(BLOCKS.map(b => b.id)).size === BLOCKS.length, 'block ids are unique')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
