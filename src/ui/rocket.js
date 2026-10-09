/* The rocket's screens (row 56): the planets at the Launch Pad and the
   landing banner. (The flight itself is in the world: src/flight.js.) */
import { PLANETS } from '../planets.js'

const coin = n => `<i class="coin"></i>${n}`

/* The list of planets for Captain Nova's card: here, fly, or open for coins. */
export function planetsCard({ here, open, coins }) {
  return '<div class="planets">' + Object.entries(PLANETS).map(([k, P]) => {
    const isOpen = open.includes(k)
    const btn = k === here ? '<span class="here">You are here</span>'
      : isOpen ? `<button class="btn" data-act="fly" data-arg="${k}">Fly! 🚀</button>`
      : `<button class="btn" data-act="unlock" data-arg="${k}" ${coins < P.price ? 'disabled' : ''}>Open · ${coin(P.price)}</button>`
    return `<div class="planet${k === here ? ' here' : ''}"><span class="picon">${P.icon}</span><div><b>${P.name}</b><small>${P.blurb}</small></div>${btn}</div>`
  }).join('') + '<p class="more">More planets are on their way!</p></div>'
}

/* "Welcome to ..." as you land. */
export function arriveBanner(P) {
  const el = document.createElement('div')
  el.className = 'hud arrive'
  el.innerHTML = `<span>${P.icon}</span><div><small>You landed on</small><b>${P.name}</b></div>`
  document.body.appendChild(el)
  setTimeout(() => el.classList.add('off'), 3500)
  setTimeout(() => el.remove(), 4500)
}
