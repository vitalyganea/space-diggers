/* The diggers: blocky animals built from boxes, each in a yellow miner's
   helmet with a lamp, so every player is one of a crew. A name tag floats
   over the head. They swing their legs as they walk and pound with the
   drill arm while digging.

   Units are blocks; the model stands 1.6 high with its feet at y 0, the
   same size as the player's collision box. */
import { MeshBuilder, StandardMaterial, Color3, Mesh, DynamicTexture, Texture } from '@babylonjs/core'

export const ANIMALS = {
  mole: {
    name: 'Mole', body: '#4a3f45', belly: '#6e5f66', nose: '#f29bb2', ear: '#4a3f45',
    claw: '#f1e3c8', eye: '#111111', snout: true,
  },
  beaver: {
    name: 'Beaver', body: '#8a5a33', belly: '#b07a4d', nose: '#2b1d14', ear: '#7a4e2b',
    claw: '#3b2a1d', eye: '#111111', teeth: '#fff4d6', tail: '#4b3a2a',
  },
  hamster: {
    name: 'Hamster', body: '#e39b4f', belly: '#fff2df', nose: '#f29bb2', ear: '#f2b98a',
    claw: '#f6d7b8', eye: '#111111', cheeks: '#ffffff',
  },
}

const mats = new Map()
function mat(scene, hex, glow = 0) {
  const key = hex + glow
  if (!mats.has(key)) {
    const m = new StandardMaterial('a' + key, scene)
    m.diffuseColor = Color3.FromHexString(hex)
    m.emissiveColor = Color3.FromHexString(hex).scale(glow)
    m.specularColor = new Color3(0.05, 0.05, 0.05)
    mats.set(key, m)
  }
  return mats.get(key)
}

/* Build one digger. Returns { root, parts, update(dt, moving, digging) }.
   `register(mesh)` is called for every box (noa needs to be handed each). */
export function makeAnimal(scene, kind, label, register = () => {}) {
  const A = ANIMALS[kind]
  const root = new Mesh(kind, scene)        // placed by noa
  const inner = new Mesh(kind + 'Inner', scene)
  inner.parent = root                       // bobs as it walks
  const box = (name, w, h, d, hex, x, y, z, parent = inner, glow = 0) => {
    const b = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene)
    b.material = mat(scene, hex, glow)
    b.parent = parent
    b.position.set(x, y, z)
    b.isPickable = false
    register(b)
    return b
  }
  // pivots for the swinging limbs sit at the hip and shoulder
  const pivot = (name, x, y, z) => { const p = new Mesh(name, scene); p.parent = inner; p.position.set(x, y, z); return p }

  const legL = pivot('legL', -0.16, 0.42, 0), legR = pivot('legR', 0.16, 0.42, 0)
  box('legL', 0.2, 0.42, 0.24, A.body, 0, -0.21, 0, legL)
  box('legR', 0.2, 0.42, 0.24, A.body, 0, -0.21, 0, legR)
  box('footL', 0.22, 0.08, 0.32, A.claw, 0, -0.38, 0.04, legL)
  box('footR', 0.22, 0.08, 0.32, A.claw, 0, -0.38, 0.04, legR)
  box('body', 0.56, 0.56, 0.4, A.body, 0, 0.7, 0)
  box('belly', 0.4, 0.42, 0.04, A.belly, 0, 0.68, 0.21)
  const head = box('head', 0.5, 0.44, 0.46, A.body, 0, 1.2, 0.02)
  const eye = A.snout ? 0.05 : 0.08                 // a mole's eyes are pinpricks
  box('eyeL', eye, eye, 0.02, A.eye, -0.12, 0.06, 0.24, head)
  box('eyeR', eye, eye, 0.02, A.eye, 0.12, 0.06, 0.24, head)
  box('earL', 0.12, 0.12, 0.08, A.ear, -0.2, 0.2, -0.04, head)
  box('earR', 0.12, 0.12, 0.08, A.ear, 0.2, 0.2, -0.04, head)
  if (A.snout) {
    box('snout', 0.22, 0.16, 0.24, A.nose, 0, -0.08, 0.34, head)
    box('nose', 0.14, 0.1, 0.05, '#e0708f', 0, -0.05, 0.47, head)
  } else box('nose', 0.1, 0.07, 0.04, A.nose, 0, -0.04, 0.25, head)
  if (A.teeth) box('teeth', 0.1, 0.1, 0.02, A.teeth, 0, -0.16, 0.24, head)
  if (A.cheeks) {
    box('cheekL', 0.14, 0.14, 0.14, A.cheeks, -0.25, -0.1, 0.12, head)
    box('cheekR', 0.14, 0.14, 0.14, A.cheeks, 0.25, -0.1, 0.12, head)
  }
  if (A.tail) box('tail', 0.34, 0.06, 0.4, A.tail, 0, 0.32, -0.38)
  // the crew's helmet: a yellow cap with a brim and a lamp that glows
  box('helmet', 0.54, 0.14, 0.5, '#f5c518', 0, 0.27, 0.0, head)
  box('brim', 0.58, 0.04, 0.58, '#e0b015', 0, 0.2, 0.03, head)
  box('lamp', 0.12, 0.1, 0.06, '#fff6c8', 0, 0.27, 0.26, head, 0.9)

  const armL = pivot('armL', -0.36, 0.92, 0), armR = pivot('armR', 0.36, 0.92, 0)
  box('armL', 0.16, 0.42, 0.18, A.body, 0, -0.18, 0, armL)
  box('armR', 0.16, 0.42, 0.18, A.body, 0, -0.18, 0, armR)
  const big = A.snout ? 1.5 : 1                      // digging claws, biggest on the mole
  box('clawL', 0.18 * big, 0.1 * big, 0.2 * big, A.claw, 0, -0.43, 0.04, armL)
  if (A.snout) box('clawR', 0.27, 0.15, 0.2, A.claw, 0, -0.43, -0.06, armR)
  // a little drill in the right paw, pointing forward
  box('drillBody', 0.12, 0.12, 0.28, '#f5c518', 0, -0.4, 0.14, armR)
  box('drillBit', 0.07, 0.07, 0.14, '#c0c7d1', 0, -0.4, 0.34, armR)

  // the name tag: text on a plane that always faces the camera
  let tag = null
  if (label) {
    const tex = new DynamicTexture('tag_' + label, { width: 256, height: 64 }, scene, false, Texture.TRILINEAR_SAMPLINGMODE)
    const g = tex.getContext()
    g.fillStyle = 'rgba(0,0,0,0.45)'
    g.fillRect(0, 8, 256, 48)
    g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.fillStyle = '#ffffff'; g.fillText(label, 128, 33)
    tex.update(); tex.hasAlpha = true
    const tm = new StandardMaterial('tagMat_' + label, scene)
    tm.diffuseTexture = tex; tm.useAlphaFromDiffuseTexture = true
    tm.disableLighting = true; tm.emissiveColor = new Color3(1, 1, 1); tm.backFaceCulling = false
    tag = MeshBuilder.CreatePlane('tag', { width: 1.0, height: 0.25 }, scene)
    tag.material = tm
    tag.parent = root
    tag.position.set(0, 1.95, 0)
    tag.billboardMode = Mesh.BILLBOARDMODE_ALL
    tag.isPickable = false
    register(tag)
  }

  let t = 0
  return {
    root, head, tag,
    /* moving: speed on the ground, 0..1; digging: true while breaking */
    update(dt, moving, digging) {
      t += dt / 1000
      const swing = Math.sin(t * 10) * 0.7 * moving
      legL.rotation.x = swing
      legR.rotation.x = -swing
      armL.rotation.x = -swing * 0.6
      armR.rotation.x = digging ? -1.2 + Math.sin(t * 16) * 0.45 : swing * 0.6
      inner.position.y = moving ? Math.abs(Math.sin(t * 10)) * 0.04 : 0
    },
  }
}
