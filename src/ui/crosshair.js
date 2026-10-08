/* The crosshair: a small white plus with a dark edge, centred. */
export function addCrosshair() {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;' +
    'pointer-events:none;z-index:5;background:' +
    'linear-gradient(#fff,#fff) center/2px 18px no-repeat,linear-gradient(#fff,#fff) center/18px 2px no-repeat;' +
    'filter:drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000)'
  document.body.appendChild(el)
  return el
}
