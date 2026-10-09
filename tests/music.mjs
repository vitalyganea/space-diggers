/* Row 41 check: the music's themes.   node tests/music.mjs */
import { THEMES, note } from '../src/music.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const names = Object.keys(THEMES)
ok(['surface', 'deep', 'menu'].every(n => names.includes(n)), 'a theme for the surface, underground and the menu')
ok(new Set(names.map(n => THEMES[n].bpm)).size === names.length, 'each at its own tempo')
ok(new Set(names.map(n => THEMES[n].chords[0][0] % 12)).size === names.length, 'each in its own key')
ok(THEMES.deep.cut < THEMES.surface.cut && THEMES.deep.bpm < THEMES.surface.bpm, 'underground darker and slower')
ok(Math.abs(note(69) - 440) < 1e-9 && Math.abs(note(81) - 880) < 1e-9, 'notes in tune')
ok(names.every(n => THEMES[n].chords.every(c => c.every(x => x >= 36 && x <= 72)) && THEMES[n].scale.every(x => x >= 55 && x <= 86)), 'nothing shrill or rumbling: pads low-middle, bells in the middle')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
