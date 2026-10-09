/* The look: the sky of space, fog, light by depth, the helmet lamp, and
   the drill in your hand. Everything here is only looked at; none of it
   changes play.

   On the Moon the sky is black even by day: stars, a band of nebula, a big
   ringed planet over the horizon and the small blue Earth far off
   (src/sky.js). The sun is hard and white, from high in the
   south-west, so tops, sides and the faces turned away read three
   different brightnesses; fog fades the far ground into the dark, which
   also hides where the loaded world ends. Going down, light and fog close
   in towards black (fully by DARK_AT), and a lamp on your helmet lights
   the few blocks around you, which is what you dig by. */
import {
  MeshBuilder, StandardMaterial, Color3, Color4, Vector3, PointLight, Mesh,
} from '@babylonjs/core'
import { makeSky } from './sky.js'

const DARK_AT = -40
const SKY_LOW = [0.03, 0.04, 0.09]           // the fog colour at the surface: space at the horizon
const DEEP = [0.03, 0.03, 0.05]
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

export function applyLook(noa, { drill = true } = {}) {
  const scene = noa.rendering.getScene()
  const cam = noa.rendering.camera

  // light: noa's single directional light, from high in the south-west
  const light = noa.rendering.light
  light.direction = new Vector3(0.45, -1, 0.65)
  scene.ambientColor = new Color3(0.5, 0.5, 0.56)

  // fog that hides where the loaded world ends
  scene.fogMode = 3                                    // linear
  scene.fogStart = 34
  scene.fogEnd = 72

  // the sky (src/sky.js)
  const sky = makeSky(noa)
  const dome = sky.dome

  // the miner's lamp
  const lamp = new PointLight('lamp', new Vector3(0, 0, 0), scene)
  lamp.diffuse = new Color3(1, 0.86, 0.62)
  lamp.specular = new Color3(0, 0, 0)
  lamp.range = 9
  lamp.intensity = 0

  const hand = drill ? makeDrill(scene, cam, noa) : null
  let t = 0
  noa.on('beforeRender', dt => {
    t += dt / 1000
    const p = noa.entities.getPosition(noa.playerEntity)
    const deep = Math.max(0, Math.min(1, -p[1] / -DARK_AT))       // 0 at the surface, 1 by DARK_AT
    const air = mix(SKY_LOW, DEEP, deep)
    scene.clearColor = new Color4(air[0], air[1], air[2], 1)
    scene.fogColor = new Color3(air[0], air[1], air[2])
    scene.fogStart = 34 - 26 * deep
    scene.fogEnd = 72 - 50 * deep
    light.intensity = 1 - 0.85 * deep
    const amb = 0.5 - 0.32 * deep
    scene.ambientColor = new Color3(amb, amb, amb * 1.04)
    sky.update(dt, deep)
    lamp.intensity = 0.25 + 1.1 * deep
    lamp.position.copyFrom(cam.globalPosition)
    if (hand) hand.update(t, noa)
  })
  return { lamp, dome, sky, hand }
}

/* The drill held in the lower right: a dark grip, a yellow body with a
   black band, a steel bit. Drawn after the world (its own rendering group),
   so it never sinks into a wall. It bobs as you walk and buzzes and pushes
   forward while you dig. */
function makeDrill(scene, cam, noa) {
  const mat = (name, c, e = 0) => {
    const m = new StandardMaterial(name, scene)
    m.diffuseColor = new Color3(...c)
    m.emissiveColor = new Color3(c[0] * e, c[1] * e, c[2] * e)
    m.specularColor = new Color3(0.15, 0.15, 0.15)
    return m
  }
  const root = new Mesh('drill', scene)
  root.parent = cam
  const parts = [
    ['grip', { width: 0.12, height: 0.26, depth: 0.14 }, [0.18, 0.18, 0.2], [0, -0.14, -0.06]],
    ['body', { width: 0.18, height: 0.18, depth: 0.38 }, [0.98, 0.76, 0.12], [0, 0.02, 0.1]],
    ['band', { width: 0.19, height: 0.19, depth: 0.05 }, [0.1, 0.1, 0.1], [0, 0.02, 0.2]],
  ]
  for (const [n, size, c, at] of parts) {
    const b = MeshBuilder.CreateBox(n, size, scene)
    b.material = mat(n + 'Mat', c, 0.35)
    b.parent = root
    b.position.set(...at)
  }
  const bit = MeshBuilder.CreateCylinder('bit', { diameterTop: 0, diameterBottom: 0.15, height: 0.3, tessellation: 4 }, scene)
  bit.material = mat('bitMat', [0.75, 0.78, 0.82], 0.4)
  bit.parent = root
  bit.rotation.x = Math.PI / 2
  bit.position.set(0, 0.02, 0.44)
  // noa only draws meshes it has been handed; parented ones keep their place
  for (const m of root.getChildMeshes()) {
    m.renderingGroupId = 1
    m.isPickable = false
    noa.rendering.addMeshToScene(m)
  }
  scene.setRenderingAutoClearDepthStencil(1, true, true, false)
  const home = new Vector3(0.34, -0.3, 0.78)
  root.position.copyFrom(home)
  root.scaling.setAll(0.62)
  root.rotation.set(0.1, -0.22, 0)
  return {
    root, bit,
    update(t, noa) {
      const v = noa.entities.getPhysics(noa.playerEntity).body.velocity
      const walking = Math.hypot(v[0], v[2]) > 0.5
      const digging = noa.inputs.state.fire && !!noa.targetedBlock
      const bob = walking ? Math.sin(t * 9) * 0.018 : 0
      const buzz = digging ? Math.sin(t * 90) * 0.006 : 0
      root.position.set(home.x + buzz, home.y + bob + buzz, home.z + (digging ? 0.06 + Math.sin(t * 14) * 0.03 : 0))
      bit.rotation.y += digging ? 0.6 : 0.02
    },
  }
}
