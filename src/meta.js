/* Between rounds: the coins you keep, the animals you own, the one you dig
   as, and the save. Pure, apart from the storage handed in.

   A round pays: the coins left in your purse, a bonus for your place, and
   one coin for every two blocks of depth. Each animal has its own perk,
   a different kind of help, never the same one twice:
     mole    (free) digs earth and stone 15% faster
     beaver  (300)  starts every round with a bomb and 10 blocks of rubble
     hamster (500)  ore pays half as much again */
import { ID } from './blocks.js'
import { ROBOTS } from './robots.js'

export const KEY = 'spacediggers-save-v1'
export const PLACE_BONUS = [50, 30, 20, 10, 10, 10]

export const SHOP = [
  { kind: 'mole', price: 0, perk: 'Digs earth and stone 15% faster' },
  { kind: 'beaver', price: 300, perk: 'Starts every round with a bomb and 10 blocks' },
  { kind: 'hamster', price: 500, perk: 'Ore pays 50% more' },
]

export function defaults() {
  return { v: 1, coins: 0, owned: ['mole'], chosen: 'mole', rounds: 0, wins: 0, bestDepth: 0, backpack: null, battery: null, gear: null, bombs: 0, robot: null, tickets: 0, found: [], museum: {}, setsDone: [], daily: {}, robotGear: null, settings: null, planet: 'moon', planetsOpen: ['moon'], arriving: false }
}

/* A save from storage, defensively: anything missing or wrong falls back. */
export function load(storage) {
  const d = defaults()
  try {
    const o = JSON.parse(storage.getItem(KEY) || 'null')
    if (!o || typeof o !== 'object') return d
    d.coins = Math.max(0, Math.floor(+o.coins || 0))
    if (Array.isArray(o.owned)) d.owned = ['mole', ...o.owned.filter(k => SHOP.some(s => s.kind === k) && k !== 'mole')]
    if (d.owned.includes(o.chosen)) d.chosen = o.chosen
    for (const k of ['rounds', 'wins', 'bestDepth']) d[k] = Math.max(0, Math.floor(+o[k] || 0))
    if (o.backpack && typeof o.backpack === 'object') d.backpack = o.backpack   // checked by Backpack itself
    if (o.battery && typeof o.battery === 'object') d.battery = o.battery       // and by Battery
    if (o.gear && typeof o.gear === 'object') d.gear = o.gear                   // and by loadGear
    d.bombs = Math.max(0, Math.min(5, Math.floor(+o.bombs || 0)))
    d.tickets = Math.max(0, Math.min(5, Math.floor(+o.tickets || 0)))
    // finds ever found, given to the Museum, and the sets completed (rows 47, 48)
    if (Array.isArray(o.found)) d.found = o.found.filter(k => typeof k === 'string' && k.length < 30).slice(0, 200)
    if (o.museum && typeof o.museum === 'object') for (const [k, v] of Object.entries(o.museum)) if (v === true && k.length < 30) d.museum[k] = true
    if (o.daily && typeof o.daily === 'object') d.daily = { last: typeof o.daily.last === 'string' ? o.daily.last : undefined, streak: Math.max(0, Math.min(7, Math.floor(+o.daily.streak || 0))),
      day: typeof o.daily.day === 'string' ? o.daily.day : undefined, quests: Array.isArray(o.daily.quests) ? o.daily.quests.slice(0, 3) : undefined }   // row 50
    // planets (row 55): where you are, which you have opened, a flight just made
    if (typeof o.planet === 'string' && o.planet.length < 20) d.planet = o.planet
    if (Array.isArray(o.planetsOpen)) d.planetsOpen = ['moon', ...o.planetsOpen.filter(k => typeof k === 'string' && k !== 'moon' && k.length < 20)]
    d.arriving = o.arriving === true
    if (o.settings && typeof o.settings === 'object') d.settings = o.settings              // clamped by loadSettings
    if (o.robotGear && typeof o.robotGear === 'object') d.robotGear = o.robotGear        // clamped by loadRobotGear
    if (Array.isArray(o.setsDone)) d.setsDone = o.setsDone.filter(k => typeof k === 'string' && k.length < 30)
    if (o.robot && ROBOTS[o.robot.kind]) d.robot = { kind: o.robot.kind, name: String(o.robot.name || '').replace(/[^\p{L}\p{N} '!?-]/gu, '').slice(0, 12) || ROBOTS[o.robot.kind].name }
  } catch (e) { /* a broken save starts fresh */ }
  return d
}

export function store(storage, save) {
  try { storage.setItem(KEY, JSON.stringify(save)) } catch (e) { /* private mode: play on */ }
}

/* What a finished round pays, and the save after it. */
export function payout(standing, purse) {
  const bonus = PLACE_BONUS[standing.place - 1] || 0
  const depth = Math.floor(standing.depth / 2)
  return { purse, bonus, depth, total: purse + bonus + depth }
}

export function afterRound(save, standing, purse) {
  const pay = payout(standing, purse)
  save.coins += pay.total
  save.rounds++
  if (standing.place === 1 && standing.finishedAt !== null) save.wins++
  save.bestDepth = Math.max(save.bestDepth, standing.depth)
  return pay
}

export function buy(save, kind) {
  const item = SHOP.find(s => s.kind === kind)
  if (!item || save.owned.includes(kind) || save.coins < item.price) return false
  save.coins -= item.price
  save.owned.push(kind)
  return true
}

export function choose(save, kind) {
  if (!save.owned.includes(kind)) return false
  save.chosen = kind
  return true
}

/* The chosen animal's perk, as numbers the game applies. */
export function perk(kind) {
  return {
    digSpeed: id => (kind === 'mole' && [ID.regolith, ID.dust, ID.moonrock].includes(id)) ? 1.15 : 1,
    coinMult: kind === 'hamster' ? 1.5 : 1,
    startBombs: kind === 'beaver' ? 1 : 0,
    startStock: kind === 'beaver' ? 10 : 0,
  }
}
