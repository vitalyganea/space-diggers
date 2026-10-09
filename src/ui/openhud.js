/* The open game's HUD. Grows with stage 1: coins and depth now; the
   backpack, battery and minimap join it in rows 16, 17 and 21. */
export class OpenHud {
  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'hud'
    this.el.innerHTML = `
      <div class="me-box panel"><span class="coins"><i class="coin"></i><b>0</b></span><span class="depth">↓ 0 m</span>
        <span class="bag"><i class="bag-ico"></i><b>0/20</b><em><s></s></em></span>
        <span class="batt"><i class="batt-ico"><s></s></i><b>100%</b><small></small></span>
        <span class="tickets" title="Tickets home (T)"><i class="ticket-ico"></i><b>0</b></span></div>
      <div class="pickups"></div>
      <div class="toast"></div>`
    document.body.appendChild(this.el)
    this.$ = sel => this.el.querySelector(sel)
  }
  update(me) {
    this.$('.coins b').textContent = me.coins
    if (me.bag) {
      const b = me.bag
      this.$('.bag b').textContent = `${b.count}/${b.capacity}`
      this.$('.bag s').style.width = Math.min(100, 100 * b.count / b.capacity) + '%'
      this.$('.bag').classList.toggle('full', b.full)
    }
    if (me.tickets !== undefined) {
      this.$('.tickets b').textContent = me.tickets
      this.$('.tickets').style.display = me.tickets ? 'inline-flex' : 'none'
    }
    if (me.battery) {
      const f = me.battery.fraction, el = this.$('.batt')
      el.querySelector('b').textContent = Math.ceil(f * 100) + '%'
      el.querySelector('s').style.width = (f * 100) + '%'
      el.className = 'batt ' + (f <= 0.1 ? 'red' : f <= 0.25 ? 'amber' : 'ok')
      el.querySelector('small').textContent = me.blocksLeft !== undefined ? `≈${me.blocksLeft} blocks` : ''
    }
    this.$('.depth').textContent = me.depth > 0 ? `↓ ${me.depth} m` : 'Surface'
  }
  /* "+1 Gold" rising beside the backpack, in the item's colour */
  pickup(text, color) {
    const el = document.createElement('div')
    el.className = 'pickup'
    el.textContent = text
    el.style.color = color
    this.$('.pickups').appendChild(el)
    setTimeout(() => el.remove(), 1200)
  }

  toast(text) {
    const t = this.$('.toast')
    t.textContent = text
    t.style.opacity = 1
    clearTimeout(this._t)
    this._t = setTimeout(() => { t.style.opacity = 0 }, 1500)
  }
}
