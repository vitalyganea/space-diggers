/* The town on screen: a name board over every door (always turned to
   you), the "[E] Market" prompt when you stand at one, and the card a
   building opens. Shops fill their cards in row 20; the rest say what is
   coming. */
import { MeshBuilder, StandardMaterial, DynamicTexture, Texture, Color3, Mesh } from '@babylonjs/core'
import { BUILDINGS, PORTAL } from '../town.js'

export function nameBoards(noa) {
  const scene = noa.rendering.getScene()
  for (const b of [...BUILDINGS, PORTAL]) {
    const tex = new DynamicTexture('board_' + b.key, { width: 512, height: 128 }, scene, false, Texture.TRILINEAR_SAMPLINGMODE)
    const g = tex.getContext()
    g.fillStyle = '#5e3d22'; g.fillRect(0, 0, 512, 128)
    g.fillStyle = '#8a5a33'; g.fillRect(8, 8, 496, 112)
    g.font = 'bold 64px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillStyle = '#2a1a0c'; g.fillText(b.name, 258, 70)
    g.fillStyle = '#fff3d6'; g.fillText(b.name, 256, 66)
    tex.update()
    const m = new StandardMaterial('boardMat_' + b.key, scene)
    m.diffuseTexture = tex
    m.emissiveColor = new Color3(0.35, 0.35, 0.35)
    m.backFaceCulling = false
    const plane = MeshBuilder.CreatePlane('board_' + b.key, { width: 3.2, height: 0.8 }, scene)
    plane.material = m
    plane.billboardMode = Mesh.BILLBOARDMODE_Y
    plane.isPickable = false
    const y = b.key === 'portal' ? 7.6 : 4.5
    noa.rendering.addMeshToScene(plane, false, [b.at[0] + b.face[0] * 0.7 + 0.5, y, b.at[1] + b.face[1] * 0.7 + 0.5])
  }
}

/* "[E] Market" at the bottom of the screen while you stand at a door. */
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
    if (door) this.el.querySelector('b').textContent = door.ready ? door.name : `${door.name} (coming soon)`
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
