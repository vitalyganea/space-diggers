/* Settings (row 53): music, sounds and how fast the mouse turns you, in a
   small card. Opened from the pause screen ("Click to play", where Esc
   leaves you) and from the title. Kept in the save as `settings`. */
export const DEFAULT_SETTINGS = { music: true, sounds: true, mouse: 1 }

export function loadSettings(o) {
  const s = { ...DEFAULT_SETTINGS }
  if (o && typeof o === 'object') {
    if (typeof o.music === 'boolean') s.music = o.music
    if (typeof o.sounds === 'boolean') s.sounds = o.sounds
    if (Number.isFinite(+o.mouse)) s.mouse = Math.max(0.3, Math.min(2.5, +o.mouse))
  }
  return s
}

/* onChange(settings) after every change; onClose() when shut. */
export function settingsCard(settings, onChange, onClose) {
  const el = document.createElement('div')
  el.className = 'overlay settings'
  const draw = () => {
    el.innerHTML = `<div class="card panel"><h1>Settings</h1>
      <div class="opt"><span>🎵 Music</span><button class="btn small ${settings.music ? '' : 'alt'}" data-k="music">${settings.music ? 'On' : 'Off'}</button></div>
      <div class="opt"><span>🔊 Sounds</span><button class="btn small ${settings.sounds ? '' : 'alt'}" data-k="sounds">${settings.sounds ? 'On' : 'Off'}</button></div>
      <div class="opt"><span>🖱️ Mouse speed</span><input type="range" min="0.3" max="2.5" step="0.1" value="${settings.mouse}"><b>${settings.mouse.toFixed(1)}×</b></div>
      <button class="btn close">Done</button></div>`
    el.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); settings[b.dataset.k] = !settings[b.dataset.k]; onChange(settings); draw() }))
    const r = el.querySelector('input')
    r.addEventListener('input', () => { settings.mouse = +r.value; el.querySelector('.opt b').textContent = settings.mouse.toFixed(1) + '×'; onChange(settings) })
    el.querySelector('.close').addEventListener('click', e => { e.stopPropagation(); el.remove(); onClose && onClose() })
  }
  el.addEventListener('click', e => e.stopPropagation())
  draw()
  document.body.appendChild(el)
  return el
}
