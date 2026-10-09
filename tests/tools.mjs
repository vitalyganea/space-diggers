/* Row 40 check: the drill and the laser.   node tests/tools.mjs */
import { Hand, toolSpeed, suits, hasLaser } from '../src/tools.js'
import { defaultGear, buy, GEAR } from '../src/gear.js'
import { ID, byId } from '../src/blocks.js'
let fails = 0
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }
const g = defaultGear()
ok(!hasLaser(g) && suits(ID.meteorite, g) === 'drill', 'a new player has only the drill')
const secs = (tool, id) => byId[id].hard / toolSpeed(tool, id, g)
const drillMet = secs('drill', ID.meteorite)
ok(drillMet >= 3 && drillMet <= 5, `without a laser, meteorite is slow but possible (${drillMet.toFixed(1)} s a block)`)
ok(buy(g, 'laser', { coins: 500 }) && hasLaser(g), `the Workshop sells a laser (${GEAR.laser.cost[1]} coins)`)
ok(secs('laser', ID.meteorite) <= drillMet / 2.5, `the laser cuts meteorite 3× as fast (${secs('laser', ID.meteorite).toFixed(1)} s)`)
ok(secs('laser', ID.crystal) < secs('drill', ID.crystal), 'and crystal too')
ok(secs('laser', ID.moonrock) > secs('drill', ID.moonrock) * 1.5, 'but is slow in ordinary rock, where the drill is better')
const h = new Hand()
ok(h.aim(ID.moonrock, g) === 'drill' && h.aim(ID.meteorite, g) === 'laser' && h.aim(ID.meteor_ore, g) === 'laser' && h.aim(ID.dust, g) === 'drill', 'the right tool picks itself as you aim at each kind of rock')
h.choose('laser', g)
ok(h.aim(ID.dust, g) === 'laser' && h.aim(ID.moonrock, g) === 'laser', 'chosen by hand (2), it stays while you aim at the same kind')
ok(h.aim(ID.meteorite, g) === 'laser' && h.aim(ID.moonrock, g) === 'drill', 'and the next change of kind picks again')
ok(new Hand().choose('laser', defaultGear()) === 'drill', 'no laser, no switching to it')
console.log(fails ? fails + ' failed' : 'all ok'); process.exit(fails ? 1 : 0)
