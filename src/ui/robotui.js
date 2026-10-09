/* The robot on screen: the first-start choice, and its speech bubbles. */
import { ROBOTS } from '../robots.js'

const face = kind => `<span class="robo-face ${kind}" style="background:${ROBOTS[kind].body};border-color:${ROBOTS[kind].trim}"><i></i><i></i></span>`

/* "Choose your robot friend": three cards, Bzz picked to start with, a
   name box with its name in it, and one button, so a new player is digging
   after a single click if they like. */
export function chooseRobot(onDone) {
  let pick = 'bzz'
  const el = document.createElement('div')
  el.className = 'overlay choose-robot'
  const draw = () => {
    el.innerHTML = `<div class="card panel"><div class="logo">Space <b>Diggers</b></div><h1>Choose your robot friend</h1>
      <h2>It digs with you, keeps you company, and goes for help when your battery runs out.</h2>
      <div class="cards">${Object.entries(ROBOTS).map(([k, r]) => `
        <button class="robot-card${k === pick ? ' picked' : ''}" data-k="${k}">${face(k)}<b>${r.name}</b><small>${r.talent}</small></button>`).join('')}</div>
      <label class="name">Its name: <input maxlength="12" value="${ROBOTS[pick].name}"></label>
      <button class="btn go">Let's dig!</button></div>`
    el.querySelectorAll('.robot-card').forEach(b => b.addEventListener('click', () => { pick = b.dataset.k; draw() }))
    el.querySelector('.go').addEventListener('click', () => {
      // letters, digits and a little punctuation only (it is shown as HTML); a <tag> goes whole
      const name = el.querySelector('input').value.replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N} '!?-]/gu, '').trim().slice(0, 12) || ROBOTS[pick].name
      el.remove()
      onDone({ kind: pick, name })
    })
  }
  draw()
  document.body.appendChild(el)
  return el
}

/* Speech bubbles: one at a time, each held long enough to read; anything
   said while one shows waits its turn (the same line twice in a row is
   dropped). */
export class Talk {
  constructor(kind, name) {
    this.kind = kind
    this.name = name
    this.queue = []
    this.el = document.createElement('div')
    this.el.className = 'hud talk'
    document.body.appendChild(this.el)
    this.last = ''
    this.busy = false
    this.said = []
  }
  say(text) {
    if (text === this.last || this.queue.includes(text)) return
    this.queue.push(text)
    if (!this.busy) this.next()
  }
  next() {
    const text = this.queue.shift()
    if (!text) { this.busy = false; this.el.classList.remove('on'); return }
    this.busy = true
    this.last = text
    this.said.push(text)
    this.el.innerHTML = `${face(this.kind)}<div><b>${this.name}</b><span>${text}</span></div>`
    this.el.classList.add('on')
    setTimeout(() => this.next(), 1800 + text.length * 45)
  }
}
