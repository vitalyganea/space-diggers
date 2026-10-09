/* The open game's HUD. Grows with stage 1: coins and depth now; the
   backpack, battery and minimap join it in rows 16, 17 and 21. */
export class OpenHud {
  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'hud'
    this.el.innerHTML = `
      <div class="me-box panel"><span class="coins"><i class="coin"></i><b>0</b></span><span class="depth">↓ 0 m</span></div>
      <div class="toast"></div>`
    document.body.appendChild(this.el)
    this.$ = sel => this.el.querySelector(sel)
  }
  update(me) {
    this.$('.coins b').textContent = me.coins
    this.$('.depth').textContent = me.depth > 0 ? `↓ ${me.depth} m` : 'Surface'
  }
  toast(text) {
    const t = this.$('.toast')
    t.textContent = text
    t.style.opacity = 1
    clearTimeout(this._t)
    this._t = setTimeout(() => { t.style.opacity = 0 }, 1500)
  }
}
