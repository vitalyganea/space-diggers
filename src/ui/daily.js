/* On screen for row 50: the daily reward card (seven days, today's lit,
   one Claim button, which is the click that starts the game) and the
   quest list, top left. */
import { STREAK, questText, questReward } from '../daily.js'

const coin = n => `<i class="coin"></i>${n}`
const what = r => [r.coins ? coin(r.coins) : '', r.bombs ? `💣×${r.bombs}` : '', r.tickets ? '🎫' : '', r.find ? '🎁' : ''].filter(Boolean).join(' ')

export function dailyCard(streakDay, onClaim) {
  const el = document.createElement('div')
  el.className = 'overlay daily'
  el.innerHTML = `<div class="card panel"><h1>Daily reward</h1><h2>Come back every day: day 7 brings a rare treasure!</h2>
    <div class="days">${STREAK.map((r, i) => `<div class="day${i + 1 === streakDay ? ' today' : i + 1 < streakDay ? ' got' : ''}"><small>Day ${i + 1}</small><b>${what(r)}</b></div>`).join('')}</div>
    <button class="btn claim">Claim!</button></div>`
  el.querySelector('.claim').addEventListener('click', () => { el.remove(); onClaim() })
  document.body.appendChild(el)
  return el
}

export class QuestList {
  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'hud quests panel'
    document.body.appendChild(this.el)
  }
  show(quests) {
    this.el.innerHTML = '<b>Today</b>' + (quests || []).map(q => `<div class="q${q.done ? ' done' : ''}"><span>${q.done ? '✔' : '○'}</span>${questText(q)}
      <small>${q.done ? '' : q.goal > 1 ? `${q.have}/${q.goal} · ` : ''}${coin(questReward(q))}</small></div>`).join('')
  }
}
