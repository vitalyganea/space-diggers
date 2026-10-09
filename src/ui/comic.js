/* The comic for a new player (row 43): five panels, drawn here in the
   game's blocky style, each with one thing to learn, the robot saying it,
   and the key or button for it. Skip is always there; the last button
   starts the game (it is the click that takes the mouse).

     1  Welcome to the Moon       you, the robot, the base, the ringed planet
     2  Dig                       look down, hold the left mouse button
     3  Collect                   shiny ore goes into your backpack
     4  Climb back up             Space against a wall (or T, a ticket home)
     5  Sell and upgrade          the Trade Hub, then the Workshop; the charging pad */
const W = 520, H = 300

export const PANELS = [
  { title: 'Welcome to the Moon!', say: 'Hi! We landed at the space base. Under the Moon\'s dust there is treasure.', keys: '', draw: welcome },
  { title: 'Dig down', say: 'Look down and hold the left mouse button. The drill does the rest!', keys: '<span class="mouse"><i></i></span> hold', draw: dig },
  { title: 'Collect treasure', say: 'Shiny ore goes in your backpack. Look in the tunnel walls for more!', keys: '', draw: collect },
  { title: 'Climb back up', say: 'Full? Hold Space against a wall to climb. A ticket (T) takes you home at once.', keys: '<kbd>Space</kbd> <kbd>T</kbd>', draw: climb },
  { title: 'Sell, then upgrade', say: 'Sell at the Trade Hub, buy a better drill at the Workshop. Battery low? The charging pad!', keys: '<kbd>E</kbd> to go in · <kbd>R</kbd> me', draw: sell },
]

export function showComic(robot, onDone) {
  let i = 0
  const el = document.createElement('div')
  el.className = 'overlay comic'
  const draw = () => {
    const P = PANELS[i], last = i === PANELS.length - 1
    el.innerHTML = `<div class="card panel">
        <div class="step">${PANELS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <h1>${P.title}</h1>
        <canvas width="${W}" height="${H}"></canvas>
        <div class="bubble"><b>${robot.name}:</b> ${P.say}</div>
        ${P.keys ? `<div class="keys">${P.keys}</div>` : ''}
        <div class="row">
          <button class="btn small alt skip">Skip</button>
          ${i > 0 ? '<button class="btn small alt back">Back</button>' : ''}
          <button class="btn next">${last ? 'Start digging!' : 'Next'}</button>
        </div></div>`
    P.draw(el.querySelector('canvas').getContext('2d'))
    el.querySelector('.next').addEventListener('click', () => { if (last) finish(); else { i++; draw() } })
    el.querySelector('.skip').addEventListener('click', finish)
    const back = el.querySelector('.back'); if (back) back.addEventListener('click', () => { i--; draw() })
  }
  const finish = () => { el.remove(); onDone() }
  draw()
  document.body.appendChild(el)
  return el
}

/* ------------------------------------------------------------ drawing kit */
const B = 20                                         // one block, in pixels
function sky(g) {
  const s = g.createLinearGradient(0, 0, 0, H); s.addColorStop(0, '#05070f'); s.addColorStop(1, '#141a3a')
  g.fillStyle = s; g.fillRect(0, 0, W, H)
  let seed = 5; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; g.fillRect(r() * W, r() * H * 0.6, 2, 2) }
}
function ringed(g, x, y, r) {
  g.save(); g.translate(x, y); g.rotate(-0.3)
  g.strokeStyle = 'rgba(233,213,180,0.85)'; g.lineWidth = r * 0.35
  g.beginPath(); g.ellipse(0, 0, r * 1.9, r * 0.45, 0, Math.PI, Math.PI * 2); g.stroke()
  g.fillStyle = '#e3a466'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#c97f4a'; for (let k = -2; k <= 2; k++) g.fillRect(-r, k * r * 0.32 - 3, r * 2, 5)
  g.beginPath(); g.ellipse(0, 0, r * 1.9, r * 0.45, 0, 0, Math.PI); g.stroke()
  g.restore()
}
function blocks(g, x0, y0, cols, rows, col, dark) {
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    g.fillStyle = (i + j) % 3 ? col : dark; g.fillRect(x0 + i * B, y0 + j * B, B - 1, B - 1)
  }
}
/* you: a blocky mole in a round glass helmet, holding the drill */
function you(g, x, y, drillDown = false) {
  g.fillStyle = '#7a5a43'; g.fillRect(x - 12, y - 30, 24, 30)                 // body
  g.fillStyle = '#9a7a60'; g.fillRect(x - 10, y - 50, 20, 20)                 // head
  g.fillStyle = '#ffb4c0'; g.fillRect(x - 3, y - 38, 6, 5)                    // nose
  g.fillStyle = '#111'; g.fillRect(x - 7, y - 45, 4, 4); g.fillRect(x + 3, y - 45, 4, 4)
  g.strokeStyle = 'rgba(190,230,255,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 40, 17, 0, Math.PI * 2); g.stroke()
  g.fillStyle = 'rgba(190,230,255,0.15)'; g.fill()
  g.fillStyle = '#f5c518'
  if (drillDown) { g.fillRect(x + 8, y - 6, 10, 18); g.fillStyle = '#cbd5e1'; g.beginPath(); g.moveTo(x + 8, y + 12); g.lineTo(x + 18, y + 12); g.lineTo(x + 13, y + 22); g.fill() }
  else { g.fillRect(x + 10, y - 22, 20, 10); g.fillStyle = '#cbd5e1'; g.beginPath(); g.moveTo(x + 30, y - 22); g.lineTo(x + 30, y - 12); g.lineTo(x + 38, y - 17); g.fill() }
}
function bot(g, x, y) {
  g.fillStyle = '#3fb8f0'; g.fillRect(x - 14, y - 9, 28, 18)
  g.fillStyle = '#0b1020'; g.fillRect(x - 10, y - 5, 20, 10)
  g.fillStyle = '#7df9ff'; g.fillRect(x - 7, y - 3, 4, 6); g.fillRect(x + 3, y - 3, 4, 6)
  g.fillStyle = '#e5e7eb'; g.fillRect(x - 22, y - 13, 14, 2); g.fillRect(x + 8, y - 13, 14, 2)
}
function ore(g, x, y, col) { g.fillStyle = col; g.fillRect(x + 4, y + 4, 8, 8); g.fillStyle = '#fff'; g.fillRect(x + 5, y + 5, 3, 3) }
function label(g, text, x, y, col = '#fde047') {
  g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#000'; g.strokeText(text, x, y); g.fillStyle = col; g.fillText(text, x, y)
}
function arrow(g, x0, y0, x1, y1, col = '#fde047') {
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
  const a = Math.atan2(y1 - y0, x1 - x0)
  g.beginPath(); g.moveTo(x1 + Math.cos(a) * 10, y1 + Math.sin(a) * 10); g.lineTo(x1 + Math.cos(a + 2.4) * 12, y1 + Math.sin(a + 2.4) * 12); g.lineTo(x1 + Math.cos(a - 2.4) * 12, y1 + Math.sin(a - 2.4) * 12); g.fill()
}

/* ------------------------------------------------------------ the panels */
function welcome(g) {
  sky(g); ringed(g, 400, 80, 42)
  blocks(g, 0, 220, 26, 4, '#a9a8a3', '#94938e')
  // the base: a module with a dome and the rocket
  g.fillStyle = '#dde3ea'; g.fillRect(250, 160, 90, 60); g.fillStyle = '#2fbf71'; g.fillRect(250, 156, 90, 8)
  g.fillStyle = 'rgba(127,182,216,0.8)'; g.beginPath(); g.arc(295, 156, 38, Math.PI, 0); g.fill()
  g.fillStyle = '#dde3ea'; g.fillRect(380, 120, 26, 100); g.fillStyle = '#e63946'; g.beginPath(); g.moveTo(380, 120); g.lineTo(406, 120); g.lineTo(393, 92); g.fill()
  g.fillRect(372, 196, 10, 24); g.fillRect(404, 196, 10, 24)
  you(g, 140, 220); bot(g, 190, 150)
}
function dig(g) {
  sky(g)
  blocks(g, 0, 120, 26, 9, '#8b8780', '#77736c')
  g.fillStyle = '#0d0f16'; g.fillRect(240, 120, B, 100)                     // the shaft
  you(g, 250, 210, true)
  for (const [x, y] of [[236, 236], [262, 240], [250, 248]]) { g.fillStyle = '#b0aca3'; g.fillRect(x, y, 6, 6) }
  label(g, 'look down + hold', 250, 70)
  g.fillStyle = '#e5e7eb'; g.fillRect(380, 40, 44, 66); g.fillStyle = '#f5c518'; g.fillRect(380, 40, 22, 30)
  g.strokeStyle = '#111'; g.lineWidth = 2; g.strokeRect(380, 40, 44, 66)
  arrow(g, 250, 90, 250, 112)
}
function collect(g) {
  blocks(g, 0, 0, 26, 15, '#76777e', '#6c6d74')
  g.fillStyle = '#0d0f16'; g.fillRect(220, 0, 60, 300)
  for (const [x, y, c] of [[180, 80, '#d9773a'], [180, 100, '#d9773a'], [300, 160, '#f5c518'], [300, 180, '#f5c518'], [180, 220, '#f472b6']]) { blocks(g, x, y, 2, 1, '#76777e', '#6c6d74'); ore(g, x, y, c); ore(g, x + B, y, c) }
  you(g, 250, 200, false)
  // the backpack
  g.fillStyle = '#8a5a33'; g.fillRect(400, 40, 70, 80); g.fillStyle = '#6b4426'; g.fillRect(410, 30, 50, 14)
  label(g, '3 / 20', 435, 145)
  arrow(g, 300, 110, 390, 80); ore(g, 330, 88, '#f5c518'); ore(g, 355, 80, '#d9773a')
}
function climb(g) {
  sky(g)
  blocks(g, 0, 100, 26, 10, '#8b8780', '#77736c')
  g.fillStyle = '#0d0f16'; g.fillRect(240, 100, B * 2, 200)
  you(g, 262, 250)
  arrow(g, 290, 250, 290, 130)
  label(g, 'Space against the wall', 260, 70)
}
function sell(g) {
  sky(g); blocks(g, 0, 240, 26, 3, '#454c58', '#3e4550')
  const mod = (x, col, name) => {
    g.fillStyle = '#dde3ea'; g.fillRect(x, 170, 110, 70); g.fillStyle = col; g.fillRect(x, 164, 110, 10)
    g.fillStyle = 'rgba(127,182,216,0.8)'; g.beginPath(); g.arc(x + 55, 164, 44, Math.PI, 0); g.fill()
    g.fillStyle = '#0d0f16'; g.fillRect(x + 45, 200, 20, 40)
    label(g, name, x + 55, 158, '#e0f2fe')
  }
  mod(40, '#2fbf71', 'Trade Hub'); mod(330, '#f5c518', 'Workshop')
  for (let k = 0; k < 5; k++) { g.fillStyle = '#f5c518'; g.beginPath(); g.arc(200 + k * 18, 210 - (k % 2) * 14, 8, 0, Math.PI * 2); g.fill() }
  arrow(g, 170, 120, 320, 120)
  g.fillStyle = '#22d3ee'; g.fillRect(230, 236, 60, 6)
  label(g, 'charging pad', 260, 280, '#7df9ff')
}
