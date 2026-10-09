/* People in space suits (row 46, the user: shopkeepers should be people
   in astronaut suits). Blocky like everything else: a white suit striped
   in their module's colour, a life-support pack on the back, a badge, a
   face with eyes and a smile, their hair, and a glass helmet with a
   coloured rim round the neck. 1.7 high, feet at y 0, facing +z.

   Returns { root, head, update(dt, moving, digging, waving) }, the same
   as an animal (src/animals.js), so the game moves them alike. */
import { MeshBuilder, StandardMaterial, Color3, Mesh } from '@babylonjs/core'

const mats = new Map()
function mat(scene, hex, glow = 0, alpha = 1) {
  const key = hex + glow + alpha
  if (!mats.has(key)) {
    const m = new StandardMaterial('p' + key, scene)
    m.diffuseColor = Color3.FromHexString(hex)
    m.emissiveColor = Color3.FromHexString(hex).scale(glow)
    m.specularColor = new Color3(alpha < 1 ? 0.6 : 0.05, alpha < 1 ? 0.6 : 0.05, alpha < 1 ? 0.6 : 0.05)
    m.alpha = alpha
    mats.set(key, m)
  }
  return mats.get(key)
}

/* look: { skin, hair, hairStyle ('short' | 'long' | 'bun' | 'bald' | 'curly'), accent (suit stripes),
   eyes, glasses, beard, glow } */
export function makeAstronaut(scene, look, register = () => {}) {
  const L = look, G = L.glow || 0
  const root = new Mesh('astronaut', scene)
  const inner = new Mesh('astronautInner', scene); inner.parent = root
  const box = (name, w, h, d, hex, x, y, z, parent = inner, glow = G, alpha = 1) => {
    const b = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene)
    b.material = mat(scene, hex, glow, alpha); b.parent = parent; b.position.set(x, y, z); b.isPickable = false
    register(b); return b
  }
  const pivot = (name, x, y, z) => { const p = new Mesh(name, scene); p.parent = inner; p.position.set(x, y, z); return p }
  const SUIT = '#eef1f5', SHADE = '#c9d0da'
  // legs and boots
  const legL = pivot('legL', -0.13, 0.62, 0), legR = pivot('legR', 0.13, 0.62, 0)
  for (const leg of [legL, legR]) {
    box('leg', 0.2, 0.5, 0.24, SUIT, 0, -0.25, 0, leg)
    box('knee', 0.21, 0.05, 0.25, L.accent, 0, -0.22, 0, leg)
    box('boot', 0.22, 0.14, 0.3, '#4b5563', 0, -0.55, 0.03, leg)
  }
  // body: the suit, its stripes, a belt, the badge, the pack on the back
  box('body', 0.48, 0.56, 0.3, SUIT, 0, 0.92, 0)
  box('stripe', 0.49, 0.06, 0.31, L.accent, 0, 1.05, 0)
  box('belt', 0.5, 0.07, 0.32, '#6b7280', 0, 0.68, 0)
  box('badge', 0.12, 0.09, 0.02, L.accent, -0.12, 0.94, 0.16, inner, Math.max(G, 0.6))
  box('panel', 0.14, 0.1, 0.02, '#1f2937', 0.11, 0.86, 0.16)
  box('light', 0.04, 0.04, 0.02, '#4ade80', 0.08, 0.88, 0.172, inner, 1.2)
  box('pack', 0.4, 0.46, 0.16, SHADE, 0, 0.95, -0.23)
  box('tank', 0.1, 0.36, 0.1, L.accent, -0.11, 0.95, -0.33); box('tank', 0.1, 0.36, 0.1, L.accent, 0.11, 0.95, -0.33)
  // arms with gloves
  const armL = pivot('armL', -0.32, 1.15, 0), armR = pivot('armR', 0.32, 1.15, 0)
  for (const arm of [armL, armR]) {
    box('arm', 0.15, 0.46, 0.17, SUIT, 0, -0.2, 0, arm)
    box('cuff', 0.16, 0.05, 0.18, L.accent, 0, -0.38, 0, arm)
    box('glove', 0.14, 0.12, 0.15, '#9ca3af', 0, -0.46, 0, arm)
  }
  // the head: face, eyes, smile, nose, hair
  const head = box('head', 0.36, 0.38, 0.34, L.skin, 0, 1.43, 0)
  box('eyeL', 0.06, 0.07, 0.02, L.eyes || '#1f2937', -0.08, 0.04, 0.175, head, 0)
  box('eyeR', 0.06, 0.07, 0.02, L.eyes || '#1f2937', 0.08, 0.04, 0.175, head, 0)
  box('shineL', 0.02, 0.02, 0.01, '#ffffff', -0.07, 0.06, 0.187, head, 1); box('shineR', 0.02, 0.02, 0.01, '#ffffff', 0.09, 0.06, 0.187, head, 1)
  box('nose', 0.05, 0.06, 0.03, L.skin, 0, -0.03, 0.18, head)
  box('smile', 0.14, 0.03, 0.02, '#9f1239', 0, -0.1, 0.175, head, 0)
  box('cheekL', 0.06, 0.04, 0.01, '#f9a8b8', -0.12, -0.05, 0.172, head, 0.2); box('cheekR', 0.06, 0.04, 0.01, '#f9a8b8', 0.12, -0.05, 0.172, head, 0.2)
  if (L.glasses) {
    box('glassL', 0.11, 0.09, 0.02, '#111827', -0.08, 0.04, 0.19, head, 0, 1); box('glassR', 0.11, 0.09, 0.02, '#111827', 0.08, 0.04, 0.19, head, 0, 1)
    box('lensL', 0.08, 0.06, 0.01, '#bae6fd', -0.08, 0.04, 0.2, head, 0.4); box('lensR', 0.08, 0.06, 0.01, '#bae6fd', 0.08, 0.04, 0.2, head, 0.4)
  }
  if (L.beard) box('beard', 0.3, 0.14, 0.05, L.hair, 0, -0.14, 0.17, head)
  const H = L.hair, st = L.hairStyle || 'short'
  if (st !== 'bald') box('hairTop', 0.38, 0.08, 0.36, H, 0, 0.21, 0, head)
  if (st === 'bald') { box('hairSideL', 0.03, 0.12, 0.2, H, -0.18, 0.02, -0.04, head); box('hairSideR', 0.03, 0.12, 0.2, H, 0.18, 0.02, -0.04, head) }
  if (st === 'short' || st === 'curly' || st === 'bun' || st === 'long') box('hairBack', 0.38, 0.24, 0.06, H, 0, 0.08, -0.17, head)
  if (st === 'short') box('fringe', 0.38, 0.06, 0.04, H, 0, 0.16, 0.16, head)
  if (st === 'curly') for (const [x, y] of [[-0.14, 0.24], [0, 0.27], [0.14, 0.24], [-0.19, 0.12], [0.19, 0.12]]) box('curl', 0.12, 0.1, 0.12, H, x, y, 0.02, head)
  if (st === 'bun') box('bun', 0.16, 0.14, 0.14, H, 0, 0.26, -0.12, head)
  if (st === 'long') { box('hairL', 0.05, 0.36, 0.3, H, -0.2, -0.04, -0.02, head); box('hairR', 0.05, 0.36, 0.3, H, 0.2, -0.04, -0.02, head); box('fringe', 0.38, 0.06, 0.04, H, 0, 0.16, 0.16, head) }
  // the helmet: a glass box round the head, a rim at the neck, a little antenna light
  box('collar', 0.5, 0.08, 0.46, L.accent, 0, 1.2, 0)
  box('helmet', 0.56, 0.54, 0.52, '#bfe3ff', 0, 1.47, 0, inner, 0.25, 0.3)
  // its edges and a glint on the visor, so the glass reads as glass
  for (const [x, z] of [[-0.28, 0.26], [0.28, 0.26], [-0.28, -0.26], [0.28, -0.26]]) box('frame', 0.025, 0.54, 0.025, '#e5f4ff', x, 1.47, z, inner, 0.6, 0.8)
  box('frameTop', 0.58, 0.025, 0.025, '#e5f4ff', 0, 1.74, 0.26, inner, 0.6, 0.8)
  box('glint', 0.05, 0.16, 0.01, '#ffffff', -0.17, 1.58, 0.265, inner, 1, 0.7)
  box('glint2', 0.03, 0.06, 0.01, '#ffffff', -0.1, 1.64, 0.265, inner, 1, 0.7)
  box('antenna', 0.03, 0.14, 0.03, '#9ca3af', 0.2, 1.8, 0)
  box('tip', 0.06, 0.06, 0.06, L.accent, 0.2, 1.88, 0, inner, 1)

  let t = Math.random() * 6
  return {
    root, head,
    update(dt, moving, digging, waving = false) {
      t += dt / 1000
      const swing = Math.sin(t * 10) * 0.6 * moving
      legL.rotation.x = swing; legR.rotation.x = -swing
      armL.rotation.x = -swing * 0.6
      armL.rotation.z = waving ? -2.6 + Math.sin(t * 9) * 0.35 : 0
      armR.rotation.x = swing * 0.6
      inner.position.y = moving ? Math.abs(Math.sin(t * 10)) * 0.03 : Math.sin(t * 1.6) * 0.008     // breathing
      head.rotation.y = waving ? 0 : Math.sin(t * 0.7) * 0.15                                       // looking about a little
    },
  }
}
