/* The robot's panel, on R (row 35): what your robot does for you, and the
   few things you can ask of it. Kept short for children: big buttons, one
   line each. `g` is the game: { robot(), bag, job(), send(item), scan(),
   tip() }. Drawn by shopCard (src/ui/townui.js). */
import { ROBOTS } from '../robots.js'
import { ITEMS } from '../items.js'

const coin = n => `<i class="coin"></i>${n}`

export const robotPanel = g => {
  let said = ''
  return {
    render() {
      const r = g.robot(), R = ROBOTS[r.kind], job = g.job()
      const does = [
        'Follows you and lights up the tunnels.',
        R.talent + '.',
        'When your battery runs out deep down, it can fly up and sell something to buy a recharge.',
      ]
      let send
      if (job && job.kind === 'trip') send = `<p class="busy">${r.name} is off selling ${ITEMS[job.item].name}: back in ${Math.ceil(g.left())} s.</p>`
      else if (!Object.keys(g.bag.items).length) send = '<p>Nothing to sell yet. Dig up some ore first!</p>'
      else send = `<p>Send ${r.name} to sell one thing for you (it takes a little while):</p><div class="row">` +
        Object.entries(g.bag.items).map(([k]) => `<button class="btn small" data-act="send" data-arg="${k}">
          <i class="dot" style="background:${ITEMS[k].color}"></i>${ITEMS[k].name} · ${coin(ITEMS[k].value)}</button>`).join('') + '</div>'
      return `<div class="robot-head"><span class="robo-face ${r.kind}" style="background:${R.body};border-color:${R.trim}"><i></i><i></i></span>
          <div><b>${r.name}</b><small>${R.name === r.name ? 'your robot friend' : 'a ' + R.name + ', your robot friend'}</small></div></div>
        <ul class="does">${does.map(d => `<li>${d}</li>`).join('')}</ul>
        ${send}
        <div class="row">
          ${R.sonar ? '<button class="btn" data-act="scan">Search for treasure</button>' : ''}
          <button class="btn alt" data-act="tip">Give me a tip</button>
        </div>
        ${said ? `<p class="said">“${said}”</p>` : ''}`
    },
    act(kind, arg) {
      if (kind === 'send') said = g.send(arg) || ''
      if (kind === 'scan') said = g.scan()
      if (kind === 'tip') said = g.tip()
    },
  }
}
