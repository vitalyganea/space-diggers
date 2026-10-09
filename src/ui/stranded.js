/* The "battery flat" card: the four ways out, redrawn four times a second
   while it is open so the robot's trip and the free rescue count down. */
const fmt = s => `${Math.floor(s / 60)}:${String(Math.ceil(s % 60) === 60 ? 59 : Math.ceil(s % 60)).padStart(2, '0')}`

export class StrandedCard {
  /* get(): { depth, coins, cost, items: [{key, name, value, n}], job, left, hasAds }
     act(kind, arg): 'pay' | 'robot' (item key) | 'ad' | 'free' | 'close' */
  constructor(get, act) {
    this.get = get
    this.act = act
    this.el = null
    this.picking = false
  }
  get open() { return !!this.el }

  show() {
    if (this.el) return
    this.el = document.createElement('div')
    this.el.className = 'overlay stranded'
    document.body.appendChild(this.el)
    this.el.addEventListener('click', e => {
      const b = e.target.closest('button')
      if (!b || b.disabled) return
      const kind = b.dataset.act
      if (kind === 'pick') { this.picking = true; this.draw(); return }
      if (kind === 'back') { this.picking = false; this.draw(); return }
      this.picking = false
      this.act(kind, b.dataset.arg)
      this.draw()
    })
    this.timer = setInterval(() => this.draw(), 250)
    this.draw()
  }

  hide() {
    if (!this.el) return
    clearInterval(this.timer)
    this.el.remove()
    this.el = null
    this.picking = false
  }

  draw() {
    if (!this.el) return
    const s = this.get()
    const busy = s.job && s.job.kind
    let body
    if (this.picking) {
      body = s.items.length
        ? `<h2>What should your robot sell?</h2><div class="pick">${s.items.map(i =>
            `<button class="btn small alt" data-act="robot" data-arg="${i.key}">${i.name} ×${i.n} · <i class="coin"></i>${i.value}</button>`).join('')}</div>
           <button class="btn small alt" data-act="back">Back</button>`
        : `<h2>Your backpack is empty: nothing to sell.</h2><button class="btn small alt" data-act="back">Back</button>`
    } else {
      body = `<h2>${s.depth} m down, and the drill has stopped. How do you get going again?</h2>
        <div class="ways">
          <button class="btn" data-act="pay" ${s.coins < s.cost || busy ? 'disabled' : ''}>Recharge now · <i class="coin"></i>${s.cost}</button>
          ${busy === 'trip'
            ? `<div class="wait">Your robot is selling ${s.job.itemName}… back in <b>${fmt(s.left)}</b><em><s style="width:${100 * (1 - s.left / s.job.total)}%"></s></em></div>`
            : `<button class="btn alt" data-act="pick" ${busy ? 'disabled' : ''}>Send your robot to sell something</button>`}
          ${s.tickets ? `<button class="btn alt" data-act="ticket" ${busy ? 'disabled' : ''}>Use a ticket home (${s.tickets} left): the sun charges you there</button>` : ''}
          ${s.hasAds ? `<button class="btn alt" data-act="ad" ${busy ? 'disabled' : ''}>▶ Watch an ad · free recharge</button>` : ''}
          ${busy === 'free'
            ? `<div class="wait">The free rescue drone is coming… <b>${fmt(s.left)}</b><em><s style="width:${100 * (1 - s.left / s.job.total)}%"></s></em></div>`
            : `<button class="btn alt" data-act="free" ${busy ? 'disabled' : ''}>Wait for the free rescue drone (1:30)</button>`}
        </div>
        <button class="btn small alt" data-act="close">Close and look around</button>`
    }
    this.el.innerHTML = `<div class="card panel"><h1>Battery flat!</h1>
      <div class="purse">You have <i class="coin"></i><b>${s.coins}</b></div>${body}</div>`
  }
}
