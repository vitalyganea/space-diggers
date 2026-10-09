/* The reveal of a find (row 47): a card slides down at the top of the
   screen with the find's icon in its rarity's colour, its name, the
   rarity, and NEW! the first time. Rarer finds stay longer and shine more;
   legendary and mythic ones burst with sparkles. It never takes the mouse
   or stops play. */
import { FINDS, RARITY } from '../finds.js'

export class Reveal {
  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'hud reveal'
    document.body.appendChild(this.el)
    this.timer = null
    this.shown = []
  }
  show(key, isNew) {
    const f = FINDS[key], R = RARITY[f.rarity]
    const big = f.rarity === 'legendary' || f.rarity === 'mythic'
    this.shown.push(key)
    this.el.className = `hud reveal on ${f.rarity}${big ? ' big' : ''}`
    this.el.style.setProperty('--c', R.colour)
    this.el.innerHTML = `<div class="icon">${f.icon}</div><div><small>${R.name} find${isNew ? ' · <b>NEW!</b>' : ''}</small><b>${f.name}</b></div>` +
      (big ? Array.from({ length: 14 }, (_, i) => `<i class="spark" style="--a:${i * 26}deg;--d:${i % 3}"></i>`).join('') : '')
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.el.classList.remove('on'), big ? 5000 : 2800)
  }
}
