/* A small readout in the corner of a sandbox, refreshed every frame. */
export function devHud(getText) {
  const el = document.createElement('pre')
  el.style.cssText = 'position:fixed;left:8px;top:8px;margin:0;padding:6px 8px;font:13px monospace;' +
    'color:#fff;background:rgba(0,0,0,.45);border-radius:6px;pointer-events:none;z-index:10'
  document.body.appendChild(el)
  const tick = () => { el.textContent = getText(); requestAnimationFrame(tick) }
  tick()
  return el
}
