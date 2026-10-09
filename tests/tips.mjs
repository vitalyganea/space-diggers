/* Row 35 check: the robot's tips.   node tests/tips.mjs */
import { tip } from '../src/tips.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const base = { batt: 1, depth: 0, bag: 0, cap: 20, coins: 0, cheapest: 30, onPad: false, tickets: 0 }
const t = o => tip({ ...base, ...o })
ok(/hold the left mouse/.test(t({})), 'a new player is told how to dig')
ok(/Climb up/.test(t({ batt: 0.1, depth: 30 })) && /Press T/.test(t({ batt: 0.1, depth: 30, tickets: 1 })), 'low and deep: climb, or the ticket if you have one')
ok(/charging pad/.test(t({ batt: 0.3 })) && !/charging pad/.test(t({ batt: 0.3, onPad: true })), 'low on the surface: the charging pad (unless you are on it)')
ok(/Trade Hub/.test(t({ bag: 20, depth: 10 })), 'a full backpack: go and sell')
ok(/Workshop/.test(t({ coins: 40, bag: 3 })), 'coins for an upgrade: the Workshop')
ok(/walls/.test(t({ depth: 12, bag: 4 })), 'digging: look at the walls for ore')
const all = [t({}), t({ batt: 0.1, depth: 30 }), t({ bag: 20 }), t({ coins: 40 }), t({ depth: 12 })]
ok(all.every(s => s.length < 110), 'every tip is short enough for a child to read')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
