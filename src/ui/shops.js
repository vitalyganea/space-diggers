/* What the Market, the Workshop and the Bomb shop show, and what their
   buttons do. `g` is the game: { coins, bag, gear, bombs, hasAds, ... }
   with the actions it needs; these only draw and ask. */
import { ITEMS } from '../items.js'
import { GEAR, value, nextCost, BOMB_PRICE, BOMB_CARRY, TICKET_PRICE, TICKET_CARRY } from '../gear.js'

const coin = n => `<i class="coin"></i>${n}`
const purse = g => `<div class="purse">You have ${coin(g.coins())}</div>`

export const market = g => ({
  render() {
    const rows = Object.entries(g.bag.items)
    if (!rows.length) return purse(g) + '<p>Your backpack is empty. Go and dig!</p>'
    const total = g.bag.sellValue()
    return purse(g) + `<table class="goods">${rows.map(([k, n]) =>
      `<tr><td><i class="dot" style="background:${ITEMS[k].color}"></i>${ITEMS[k].name}</td><td>×${n}</td>
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
      return `<tr><td><b>${d.name}</b><br><small>Lv ${g.gear[k] + 1}: ${now} ${d.unit}${next !== null ? ` → ${next}` : ''}</small></td>
        <td>${c === null ? '<b>MAX</b>' : `<button class="btn small" data-act="buy" data-arg="${k}" ${g.coins() < c ? 'disabled' : ''}>Upgrade · ${coin(c)}</button>`}</td></tr>`
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
