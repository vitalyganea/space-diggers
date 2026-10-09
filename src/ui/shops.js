/* What the Market, the Workshop and the Bomb shop show, and what their
   buttons do. `g` is the game: { coins, bag, gear, bombs, hasAds, ... }
   with the actions it needs; these only draw and ask. */
import { ITEMS } from '../items.js'
import { SETS, FINDS, RARITY } from '../finds.js'
import { has, setProgress } from '../museum.js'
import { GEAR, value, nextCost, BOMB_PRICE, BOMB_CARRY, TICKET_PRICE, TICKET_CARRY } from '../gear.js'

const coin = n => `<i class="coin"></i>${n}`
const purse = g => `<div class="purse">You have ${coin(g.coins())}</div>`

export const market = g => ({
  render() {
    const rows = Object.entries(g.bag.items)
    if (!rows.length) return purse(g) + '<p>Your backpack is empty. Go and dig!</p>'
    const total = g.bag.sellValue()
    return purse(g) + `<table class="goods">${rows.map(([k, n]) =>
      `<tr><td>${ITEMS[k].icon ? `<span class="ficon" style="--c:${ITEMS[k].color}">${ITEMS[k].icon}</span>` : `<i class="dot" style="background:${ITEMS[k].color}"></i>`}${ITEMS[k].name}</td><td>×${n}</td>
        <td>${coin(Math.round(ITEMS[k].value * n * g.sellMult()))}</td>
        <td><button class="btn small alt" data-act="sell" data-arg="${k}">Sell</button></td></tr>`).join('')}</table>
      <div class="row"><button class="btn" data-act="sellAll">Sell everything · ${coin(total)}</button>
      ${g.hasAds ? `<button class="btn alt" data-act="sellDouble">▶ Watch an ad · sell for ${coin(total * 2)}</button>` : ''}</div>`
  },
  act: (kind, arg) => kind === 'sell' ? g.sellOne(arg) : kind === 'sellAll' ? g.sellAll(1) : g.sellAllAd(),
})

export const workshop = g => ({
  render() {
    return purse(g) + `<table class="goods">${Object.entries(GEAR).map(([k, d]) => {
      const c = nextCost(g.gear, k), now = value(g.gear, k)
      const next = c === null ? null : d.levels[g.gear[k] + 1]
      const notYet = k === 'laser' && g.gear[k] === 0
      const what = notYet ? 'Cuts black meteorite rock and crystal 3× as fast. Picks itself when you aim at them.'
        : `Lv ${g.gear[k] + (k === 'laser' ? 0 : 1)}: ${now} ${d.unit}${next !== null ? ` → ${next}` : ''}`
      return `<tr><td><b>${d.name}</b><br><small>${what}</small></td>
        <td>${c === null ? '<b>MAX</b>' : `<button class="btn small" data-act="buy" data-arg="${k}" ${g.coins() < c ? 'disabled' : ''}>${notYet ? 'Buy' : 'Upgrade'} · ${coin(c)}</button>`}</td></tr>`
    }).join('')}</table>`
  },
  act: (kind, arg) => g.buyGear(arg),
})

export const bombShop = g => ({
  render() {
    const full = g.bombs() >= BOMB_CARRY
    return purse(g) + `<p>A bomb clears a ball of rock round where it lands. Throw it with <kbd>Q</kbd>.</p>
      <div class="row"><button class="btn" data-act="bomb" ${full || g.coins() < BOMB_PRICE ? 'disabled' : ''}>Buy a bomb · ${coin(BOMB_PRICE)}</button>
      <span class="have">You carry ${g.bombs()}/${BOMB_CARRY}</span></div>
      <p>A ticket home takes you straight back to town from anywhere. Use it with <kbd>T</kbd>.</p>
      <div class="row"><button class="btn" data-act="ticket" ${g.tickets() >= TICKET_CARRY || g.coins() < TICKET_PRICE ? 'disabled' : ''}>Buy a ticket home · ${coin(TICKET_PRICE)}</button>
      <span class="have">You carry ${g.tickets()}/${TICKET_CARRY}</span></div>`
  },
  act: kind => kind === 'ticket' ? g.buyTicket() : g.buyBomb(),
})

/* The Museum (row 48): every set, a slot per find: on show, ready to give
   (it is in your backpack), or still to find (a ? in its rarity's colour). */
export const museumShop = g => ({
  render() {
    return Object.entries(SETS).map(([set, S]) => {
      const p = setProgress(g.save, set), done = g.save.setsDone.includes(set)
      const slots = S.finds.map(([k]) => {
        const f = FINDS[k], c = RARITY[f.rarity].colour
        if (has(g.save, k)) return `<span class="slot on" style="--c:${c}" title="${f.name}">${f.icon}</span>`
        if (g.bag.items[k]) return `<button class="slot give" style="--c:${c}" data-act="donate" data-arg="${k}" title="Give the ${f.name}">${f.icon}<small>Give</small></button>`
        return `<span class="slot" style="--c:${c}" title="${RARITY[f.rarity].name}">?</span>`
      }).join('')
      return `<div class="set${done ? ' done' : ''}"><div class="set-head"><b>${S.name}</b><span>${p.have}/${p.of}</span>
        <span class="reward">${done ? '✔ Complete' : `Complete it: ${coin(S.reward)}`}</span></div><div class="slots">${slots}</div></div>`
    }).join('')
  },
  act: (kind, arg) => g.donate(arg),
})
