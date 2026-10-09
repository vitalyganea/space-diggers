/* The robot friends: what each is good at, and its model, built from boxes
   like everything else. Each has a glowing face screen with two eyes; the
   screen's light is what lights the tunnel round you (a small lamp of its
   own, in src/companion.js).

     Bzz    a drone on four rotors: its trips to the Market take half as long
     Bolt   a little tracked carrier with a crate on its back: 10 more slots
     Sonar  a round scout with a turning dish: feels gold and gems nearby */
import { MeshBuilder, StandardMaterial, Color3, Mesh } from '@babylonjs/core'

export const ROBOTS = {
  bzz: { name: 'Bzz', talent: 'A fast drone: its trips to the Market take half as long', body: '#3fb8f0', trim: '#1d4e89', tripSpeed: 2, bagBonus: 0, sonar: false },
  bolt: { name: 'Bolt', talent: 'A strong carrier: 10 more slots in your backpack', body: '#f59e0b', trim: '#7c3d0a', tripSpeed: 1, bagBonus: 10, sonar: false },
  sonar: { name: 'Sonar', talent: 'A scout: feels gold and gems close by and tells you where', body: '#a78bfa', trim: '#4c1d95', tripSpeed: 1, bagBonus: 0, sonar: true },
}

const mats = new Map()
function mat(scene, hex, glow = 0.15) {
  const k = hex + glow
  if (!mats.has(k)) {
    const m = new StandardMaterial('r' + k, scene)
    m.diffuseColor = Color3.FromHexString(hex)
    m.emissiveColor = Color3.FromHexString(hex).scale(glow)
    m.specularColor = new Color3(0.3, 0.3, 0.3)
    mats.set(k, m)
  }
  return mats.get(k)
}

/* Returns { root, update(dt, moving) }. About 0.6 blocks across. */
export function makeRobot(scene, kind, register = () => {}) {
  const R = ROBOTS[kind]
  const holder = new Mesh('robot_' + kind, scene)     // placed by the companion
  const root = new Mesh('robotBody', scene)           // hovers inside it
  root.parent = holder
  const box = (name, w, h, d, hex, x, y, z, parent = root, glow) => {
    const b = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene)
    b.material = mat(scene, hex, glow); b.parent = parent; b.position.set(x, y, z); b.isPickable = false
    register(b); return b
  }
  const spin = []
  if (kind === 'bzz') {
    box('body', 0.42, 0.22, 0.42, R.body, 0, 0, 0)
    for (const [x, z] of [[0.28, 0.28], [-0.28, 0.28], [0.28, -0.28], [-0.28, -0.28]]) {
      box('arm', 0.04, 0.04, 0.2, R.trim, x * 0.6, 0.06, z * 0.6)
      const hub = new Mesh('hub', scene); hub.parent = root; hub.position.set(x, 0.12, z)
      box('rotor', 0.3, 0.02, 0.05, '#e5e7eb', 0, 0, 0, hub, 0.3)
      spin.push([hub, 40])
    }
  } else if (kind === 'bolt') {
    box('body', 0.4, 0.32, 0.36, R.body, 0, 0, 0)
    box('trackL', 0.1, 0.12, 0.44, '#262626', -0.22, -0.18, 0)
    box('trackR', 0.1, 0.12, 0.44, '#262626', 0.22, -0.18, 0)
    box('crate', 0.3, 0.2, 0.18, '#8a5a33', 0, 0.12, -0.24)
  } else {
    box('body', 0.36, 0.36, 0.36, R.body, 0, 0, 0)
    const mast = new Mesh('mast', scene); mast.parent = root; mast.position.set(0, 0.24, 0)
    box('pole', 0.04, 0.16, 0.04, R.trim, 0, 0, 0, mast)
    box('dish', 0.26, 0.04, 0.12, '#e5e7eb', 0, 0.1, 0, mast, 0.3)
    spin.push([mast, 3])
  }
  // the face: a dark screen with two glowing eyes, at the front (+z)
  const face = kind === 'bolt' ? 0.19 : kind === 'bzz' ? 0.22 : 0.19
  box('screen', 0.3, 0.16, 0.02, '#0b1020', 0, kind === 'bzz' ? 0 : 0.02, face, root, 0)
  box('eyeL', 0.06, 0.07, 0.02, '#7df9ff', -0.07, kind === 'bzz' ? 0 : 0.02, face + 0.012, root, 1.2)
  box('eyeR', 0.06, 0.07, 0.02, '#7df9ff', 0.07, kind === 'bzz' ? 0 : 0.02, face + 0.012, root, 1.2)

  let t = 0
  return {
    root: holder,
    update(dt, moving) {
      t += dt / 1000
      for (const [m, s] of spin) m.rotation.y += s * dt / 1000
      root.position.y = Math.sin(t * 2.4) * 0.05                  // a gentle hover
      root.rotation.z = moving ? Math.sin(t * 6) * 0.06 : 0
    },
  }
}
