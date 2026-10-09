/* The base on screen: a lit name panel fixed to the wall over every door
   (facing out; they used to turn after you and swing into the walls), the "[E] Trade Hub" prompt when you stand at one, and the card a
   building opens. Shops fill their cards in row 20; the rest say what is
   coming. */
import { MeshBuilder, StandardMaterial, DynamicTexture, Texture, Color3, Mesh, Vector4 } from '@babylonjs/core'
import { BUILDINGS, PORTAL, PAD } from '../town.js'
import { KEEPERS } from '../shopkeepers.js'

export function nameBoards(noa) {
  const scene = noa.rendering.getScene()
  for (const b of [...BUILDINGS, PORTAL, PAD]) {
    const tex = new DynamicTexture('board_' + b.key, { width: 512, height: 128 }, scene, false, Texture.TRILINEAR_SAMPLINGMODE)
    const g = tex.getContext()
    g.fillStyle = '#7dd3fc'; g.fillRect(0, 0, 512, 128)                       // a lit edge
    g.fillStyle = '#0b1324'; g.fillRect(6, 6, 500, 116)
    g.font = 'bold 64px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.shadowColor = '#38bdf8'; g.shadowBlur = 18
    g.fillStyle = '#e0f2fe'; g.fillText(b.name, 256, 68)
    tex.update()
    const m = new StandardMaterial('boardMat_' + b.key, scene)
    m.diffuseTexture = tex
    m.emissiveColor = new Color3(0.85, 0.85, 0.85)                           // it glows: readable in the base's shadows
    m.backFaceCulling = false
    // two-sided, the back's picture flipped, so a sign seen from behind (the portal stands free) reads the right way
    const plane = MeshBuilder.CreatePlane('board_' + b.key, { width: 3.2, height: 0.8, sideOrientation: Mesh.DOUBLESIDE,
      frontUVs: new Vector4(1, 0, 0, 1), backUVs: new Vector4(0, 0, 1, 1) }, scene)
    plane.material = m
    plane.isPickable = false
    // a plane shows its face towards -z: turn that to face out of the building
    const [fx, fz] = b.face || [1, 0]
    plane.rotation.y = Math.atan2(-fx, -fz)
    // just off the outside of the front wall (the wall block's face is half a block out from its middle)
    const at = b.key === 'pad' ? [b.door[0] - 0.4, 3.4, b.door[2]]
      : [b.at[0] + 0.5 + fx * 0.54, b.key === 'portal' ? 7.6 : 4.5, b.at[1] + 0.5 + fz * 0.54]
    noa.rendering.addMeshToScene(plane, false, at)
  }
}

/* "[E] Trade Hub" at the bottom of the screen while you stand at a door. */
export class DoorPrompt {
  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'hud door-prompt'
    this.el.innerHTML = '<div class="panel"><kbd>E</kbd> <b></b></div>'
    document.body.appendChild(this.el)
    this.show(null)
  }
  show(door) {
    this.el.style.display = door ? 'block' : 'none'
    if (door) this.el.querySelector('b').textContent = door.keeper && KEEPERS[door.key]
      ? `Talk to ${KEEPERS[door.key].name}`                                     // at a counter: the shopkeeper (row 46)
      : door.ready ? door.name : `${door.name} (coming soon)`
  }
}

/* A building's card: a title, some content, a Close button. */
export function buildingCard(title, html, onClose) {
  const el = document.createElement('div')
  el.className = 'overlay building'
  el.innerHTML = `<div class="card panel"><h1>${title}</h1><div class="body">${html}</div>
    <button class="btn small alt close">Close</button></div>`
  document.body.appendChild(el)
  el.querySelector('.close').addEventListener('click', () => { el.remove(); onClose && onClose() })
  return el
}

/* A shop's card: `render()` gives its body, buttons with data-act (and
   data-arg) call `act(kind, arg)`, after which it redraws. */
export function shopCard(title, render, act, onClose) {
  const el = document.createElement('div')
  el.className = 'overlay building'
  const draw = () => {
    el.innerHTML = `<div class="card panel"><h1>${title}</h1><div class="body">${render()}</div>
      <button class="btn small alt close">Close</button></div>`
  }
  el.addEventListener('click', async e => {
    const b = e.target.closest('button')
    if (!b || b.disabled) return
    if (b.classList.contains('close')) { el.remove(); onClose && onClose(); return }
    if (b.dataset.act) { await act(b.dataset.act, b.dataset.arg); if (el.isConnected) draw() }
  })
  draw()
  document.body.appendChild(el)
  return el
}
