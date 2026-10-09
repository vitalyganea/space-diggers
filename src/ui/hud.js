/* The race HUD and the results card, drawn from a Round each frame. */
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const ord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th')

export class Hud {
  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'hud'
    this.el.innerHTML = `
      <div class="timer panel"></div>
      <div class="board panel"></div>
      <div class="me-box panel"><span class="coins"><i class="coin"></i><b>0</b></span><span class="depth">↓ 0 m</span></div>
      <div class="shop panel"><div class="item drill"></div><div class="item bomb"></div>
        <div class="item throw"></div><div class="item place"></div></div>
      <div class="toast"></div>
      <div class="count"></div>
      <div class="msg"></div>`
    document.body.appendChild(this.el)
    this.$ = sel => this.el.querySelector(sel)
  }

  update(round, me) {
    const timer = this.$('.timer')
    timer.textContent = fmt(round.phase === 'countdown' ? round.limit : round.timeLeft)
    timer.classList.toggle('low', round.phase === 'race' && round.timeLeft < 30)
    this.$('.board').innerHTML = round.standings().map(s => `
      <div class="row${s.isPlayer ? ' me' : ''}${s.finishedAt !== null ? ' done' : ''}">
        <span>${s.place}</span><span>${s.name}</span><span>${s.finishedAt !== null ? 'Core' : s.depth + 'm'}</span>
        <div class="bar"><i style="width:${(s.progress * 100).toFixed(1)}%"></i></div></div>`).join('')
    this.$('.coins b').textContent = me.coins
    this.$('.depth').textContent = `↓ ${me.depth} m`
    const count = this.$('.count')
    if (round.phase === 'countdown') { count.textContent = round.countdown; count.className = 'count' }
    else if (round.phase === 'race' && round.raceTime < 1) { count.textContent = 'DIG!'; count.className = 'count go' }
    else count.textContent = ''
  }

  message(text) { this.$('.msg').textContent = text || '' }

  /* The shop strip: what the next drill and a bomb cost, lit when affordable. */
  shop(h, nextDrill, bombCost, maxBombs) {
    const d = this.$('.shop .drill'), b = this.$('.shop .bomb')
    if (nextDrill) {
      d.innerHTML = `<kbd>1</kbd> Drill ${nextDrill.level} <i class="coin"></i>${nextDrill.cost}`
      d.className = 'item drill ' + (h.coins >= nextDrill.cost ? 'can' : 'no')
    } else { d.innerHTML = `Drill ${h.drillLevel} MAX`; d.className = 'item drill' }
    b.innerHTML = `<kbd>2</kbd> Bomb <i class="coin"></i>${bombCost}`
    b.className = 'item bomb ' + (h.coins >= bombCost && h.bombs < maxBombs ? 'can' : 'no')
    const th = this.$('.shop .throw'), pl = this.$('.shop .place')
    th.innerHTML = `<kbd>Q</kbd> Throw ×${h.bombs}/${maxBombs}`
    th.className = 'item throw ' + (h.bombs > 0 ? 'can' : 'no')
    pl.innerHTML = `<kbd>R-click</kbd> Block ×${h.stock}`
    pl.className = 'item place ' + (h.stock > 0 ? 'can' : 'no')
  }

  toast(text) {
    const t = this.$('.toast')
    t.textContent = text
    t.style.opacity = 1
    clearTimeout(this._toastT)
    this._toastT = setTimeout(() => { t.style.opacity = 0 }, 1300)
  }
}

/* The results card: the standings, what the round paid, Play again and
   Animals. `pay` is meta.payout()'s result, `bank` the coins saved. */
export function showResults(round, onAgain, pay = null, bank = 0, onAnimals = null) {
  const s = round.standings()
  const me = s.find(x => x.isPlayer)
  const won = me && me.place === 1 && me.finishedAt !== null
  const el = document.createElement('div')
  el.className = 'overlay results'
  el.innerHTML = `<div class="card panel">
    <h1>${won ? 'You win!' : `${ord(me.place)} place`}</h1>
    <h2>${round.winner() ? `${round.winner().name} reached the Core first` : 'Time up: the deepest digger leads'}</h2>
    <table>${s.map(x => `<tr class="${x.isPlayer ? 'me' : ''}"><td>${ord(x.place)}</td><td>${x.name}</td>
      <td>${x.finishedAt !== null ? 'Core in ' + fmt(x.finishedAt) : x.depth + ' m'}</td></tr>`).join('')}</table>
    ${pay ? `<div class="pay"><i class="coin"></i><b>+${pay.total}</b> <span>(${pay.purse} kept, ${pay.bonus} for your place, ${pay.depth} for depth)</span>
      <div class="bank">You have <i class="coin"></i><b>${bank}</b></div></div>` : ''}
    <div class="buttons"><button class="btn again">Play again</button>${onAnimals ? '<button class="btn alt animals">Animals</button>' : ''}</div></div>`
  document.body.appendChild(el)
  el.querySelector('.again').addEventListener('click', () => onAgain())
  if (onAnimals) el.querySelector('.animals').addEventListener('click', () => onAnimals())
  return el
}

/* The animal shop: a card each, Buy or Choose. Calls back to change the
   save, then redraws. */
export function showAnimals(save, shop, { portrait, onBuy, onChoose, onClose }) {
  const el = document.createElement('div')
  el.className = 'overlay animals-shop'
  const draw = () => {
    el.innerHTML = `<div class="card panel"><h1>Animals</h1><h2>You have <i class="coin"></i><b>${save.coins}</b></h2>
      <div class="cards">${shop.map(s => {
        const owned = save.owned.includes(s.kind), chosen = save.chosen === s.kind
        const btn = chosen ? '<button class="btn small" disabled>Digging</button>'
          : owned ? `<button class="btn small choose" data-k="${s.kind}">Choose</button>`
          : `<button class="btn small buy" data-k="${s.kind}" ${save.coins < s.price ? 'disabled' : ''}><i class="coin"></i>${s.price}</button>`
        return `<div class="animal${chosen ? ' chosen' : ''}" data-k="${s.kind}"><div class="pic"></div><h3>${s.kind[0].toUpperCase() + s.kind.slice(1)}</h3>
          <p>${s.perk}</p>${btn}</div>`
      }).join('')}</div><button class="btn alt close">Back</button></div>`
    el.querySelectorAll('.animal').forEach(a => a.querySelector('.pic').appendChild(portrait(a.dataset.k)))
    el.querySelectorAll('.buy').forEach(b => b.addEventListener('click', () => { onBuy(b.dataset.k); draw() }))
    el.querySelectorAll('.choose').forEach(b => b.addEventListener('click', () => { onChoose(b.dataset.k); draw() }))
    el.querySelector('.close').addEventListener('click', () => { el.remove(); onClose() })
  }
  draw()
  document.body.appendChild(el)
  return el
}

/* "Click to play" whenever the mouse is not locked to the game mid-round.
   The lock is asked for on `lockEl`, noa's own container: noa counts the
   mouse as locked only when that element holds it, and otherwise ignores
   mouse movement (asking for it on the canvas left the view frozen). */
export function clickToPlay(isRacing, lockEl, title = 'Click to dig', help = 'WASD move · Space jump · hold left mouse to dig') {
  const el = document.createElement('div')
  el.className = 'overlay click-to-play'
  el.innerHTML = `<div class="card panel"><h1>${title}</h1><h2>${help}</h2></div>`
  el.style.cursor = 'pointer'
  document.body.appendChild(el)
  const refresh = () => { el.style.display = !document.pointerLockElement && isRacing() ? 'flex' : 'none' }
  document.addEventListener('pointerlockchange', refresh)
  el.addEventListener('click', () => lockMouse(lockEl))
  setInterval(refresh, 300)
  return el
}

/* Ask for the mouse; a refusal (no real click behind it, the browser busy)
   is quiet: "Click to play" is there to try again. */
export function lockMouse(el) {
  try { const r = el.requestPointerLock(); if (r && r.catch) r.catch(() => {}) } catch (e) { /* refused */ }
}
