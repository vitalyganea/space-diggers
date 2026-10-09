/* The Museum's show cases (row 49): two glowing cases on its side walls,
   a set to a row, a slot per find. What you have given shines in its
   rarity's colour; what is still to find is a ? in a dim frame. Redrawn
   whenever a gift is made. */
import { MeshBuilder, StandardMaterial, DynamicTexture, Color3, Mesh, Vector4 } from '@babylonjs/core'
import { BUILDINGS } from './town.js'
import { SETS, FINDS, RARITY } from './finds.js'

const SLOT = 128
export function makeDisplays(noa, save) {
  const scene = noa.rendering.getScene()
  const b = BUILDINGS.find(q => q.key === 'museum')
  const [fx, fz] = b.face, rx = -fz, rz = fx
  // local (u along the front, v in from the front wall) to world
  const at = (u, v, y) => [b.at[0] + u * rx - v * fx + 0.5, y, b.at[1] + u * rz - v * fz + 0.5]
  const rows = Object.keys(SETS)
  const walls = [[-1, rows.slice(0, 2)], [1, rows.slice(2, 4)]].map(([side, sets]) => {
    const tex = new DynamicTexture('case' + side, { width: SLOT * 5, height: SLOT * 2 + 40 }, scene, true)
    const m = new StandardMaterial('caseMat' + side, scene)
    m.diffuseTexture = tex; m.emissiveColor = new Color3(0.9, 0.9, 0.9); m.specularColor = new Color3(0, 0, 0)
    const plane = MeshBuilder.CreatePlane('case' + side, { width: 4.6, height: 2.2, sideOrientation: Mesh.DOUBLESIDE,
      frontUVs: new Vector4(1, 0, 0, 1), backUVs: new Vector4(0, 0, 1, 1) }, scene)
    plane.material = m; plane.isPickable = false
    const pos = at(side * 2.46, 3, 2.45), mid = at(0, 3, 2.45)
    plane.rotation.y = Math.atan2(-(mid[0] - pos[0]), -(mid[2] - pos[2]))      // facing into the room
    noa.rendering.addMeshToScene(plane, false, pos)
    return { tex, sets }
  })
  const draw = () => {
    for (const w of walls) {
      const g = w.tex.getContext(), W = SLOT * 5, H = SLOT * 2 + 40
      g.fillStyle = '#0b1324'; g.fillRect(0, 0, W, H)
      w.sets.forEach((set, row) => {
        const y0 = 20 + row * SLOT
        SETS[set].finds.forEach(([k], i) => {
          const f = FINDS[k], c = RARITY[f.rarity].colour, on = !!save.museum[k], x0 = i * SLOT
          g.fillStyle = on ? '#14213d' : '#0f172a'; g.fillRect(x0 + 8, y0 + 8, SLOT - 16, SLOT - 16)
          g.lineWidth = on ? 6 : 3; g.strokeStyle = on ? c : '#334155'; g.strokeRect(x0 + 8, y0 + 8, SLOT - 16, SLOT - 16)
          g.textAlign = 'center'; g.textBaseline = 'middle'
          if (on) {
            const glow = g.createRadialGradient(x0 + SLOT / 2, y0 + SLOT / 2, 4, x0 + SLOT / 2, y0 + SLOT / 2, SLOT / 2)
            glow.addColorStop(0, c + 'aa'); glow.addColorStop(1, c + '00'); g.fillStyle = glow; g.fillRect(x0 + 10, y0 + 10, SLOT - 20, SLOT - 20)
            g.font = '64px sans-serif'; g.fillText(f.icon, x0 + SLOT / 2, y0 + SLOT / 2 + 4)
          } else { g.font = 'bold 54px sans-serif'; g.fillStyle = c + '66'; g.fillText('?', x0 + SLOT / 2, y0 + SLOT / 2 + 4) }
        })
      })
      w.tex.update()
    }
  }
  draw()
  return { refresh: draw }
}
