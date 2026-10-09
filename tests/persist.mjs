/* System 15 check: the world kept between sessions.   node tests/persist.mjs */
import { encodeEdits, decodeEdits, saveWorld, loadWorld, WORLD_KEY } from '../src/persist.js'
import { World } from '../src/world.js'
import { blast } from '../src/blast.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)) } }
const same = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v)

const w = new World(9)
for (let y = 0; y > -80; y--) w.set(3, y, 4, 0)              // a shaft
w.set(3, -10, 5, 15); w.set(3, -11, 5, 15)                   // rubble placed
blast(w, [10.5, -30, 2.5])                                    // a crater
const enc = encodeEdits(w.edits)
ok(same(decodeEdits(enc), w.edits), `edits survive encoding (${w.edits.size} blocks)`)
ok(encodeEdits(new Map([['3,0,4', 0], ['3,-1,4', 0], ['3,-2,4', 0]])) === '3,4:0~-2=0', 'a dug shaft is one run')
ok(enc.length < w.edits.size * 4, `compact: ${enc.length} chars for ${w.edits.size} blocks`)

// a long play: 30 shafts of 100 and 60 bomb craters
const big = new World(9)
for (let k = 0; k < 30; k++) for (let y = 0; y > -100; y--) big.set(k * 7, y, (k * 13) % 40, 0)
for (let k = 0; k < 60; k++) blast(big, [k * 3.1, -20 - k, (k * 5) % 30])
const st = mem()
const bytes = saveWorld(st, big, [1.234, -50.5, 7])
ok(bytes < 200000, `a long-played world saves in ${(bytes / 1024).toFixed(0)} KB (${big.edits.size} blocks)`)
const back = loadWorld(st)
ok(back.seed === 9 && same(back.edits, big.edits) && back.pos.join() === '1.23,-50.5,7', 'and loads back: seed, every block, the player\'s place')
ok(loadWorld(mem()) === null, 'no save: a new world')
st.setItem(WORLD_KEY, '{garbage'); ok(loadWorld(st) === null, 'a broken save: a new world, no crash')
ok(decodeEdits('1,2:5~x=0|nope;;bad').size === 0, 'garbage inside the edits is skipped')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
