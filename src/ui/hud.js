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
      <div class="shop panel"><div class="item drill"></div><div class="item bomb"></div></div>
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
      d.innerHTML = `<kbd>1</kbd> Drill Lv${nextDrill.level} <i class="coin"></i>${nextDrill.cost}`
      d.className = 'item drill ' + (h.coins >= nextDrill.cost ? 'can' : 'no')
    } else { d.innerHTML = `Drill Lv${h.drillLevel} MAX`; d.className = 'item drill' }
    b.innerHTML = `<kbd>2</kbd> Bomb <i class="coin"></i>${bombCost} <span>(${h.bombs}/${maxBombs})</span>`
    b.className = 'item bomb ' + (h.coins >= bombCost && h.bombs < maxBombs ? 'can' : 'no')
  }

  toast(text) {
    const t = this.$('.toast')
    t.textContent = text
    t.style.opacity = 1
    clearTimeout(this._toastT)
    this._toastT = setTimeout(() => { t.style.opacity = 0 }, 1300)
  }
}

/* The results card. `onAgain` runs when Play again is pressed. */
export function showResults(round, onAgain) {
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
    <button class="btn again">Play again</button></div>`
  document.body.appendChild(el)
  el.querySelector('.again').addEventListener('click', () => onAgain())
  return el
}

/* "Click to play" whenever the mouse is not locked to the game mid-round.
   The lock is asked for on `lockEl`, noa's own container: noa counts the
   mouse as locked only when that element holds it, and otherwise ignores
   mouse movement (asking for it on the canvas left the view frozen). */
export function clickToPlay(isRacing, lockEl) {
  const el = document.createElement('div')
  el.className = 'overlay click-to-play'
  el.innerHTML = '<div class="card panel"><h1>Click to dig</h1><h2>WASD move · Space jump · hold left mouse to dig</h2></div>'
  el.style.cursor = 'pointer'
  document.body.appendChild(el)
  const refresh = () => { el.style.display = !document.pointerLockElement && isRacing() ? 'flex' : 'none' }
  document.addEventListener('pointerlockchange', refresh)
  el.addEventListener('click', () => lockEl.requestPointerLock())
  setInterval(refresh, 300)
  return el
}
