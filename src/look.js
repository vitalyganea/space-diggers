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
const SKY_LOW_MOON = [0.03, 0.04, 0.09]      // the fog colour at the surface: space at the horizon
const DEEP = [0.03, 0.03, 0.05]
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

/* planet: a planet's look (src/planets.js .sky), the Moon's by default */
export function applyLook(noa, { drill = true, planet = null } = {}) {
  const SKY_LOW = planet && planet.fog ? planet.fog : SKY_LOW_MOON
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
  const sky = makeSky(noa, planet || {})
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
    // planet-light: the higher the ringed planet, the warmer and a little brighter the shade (row 37)
    const amb = 0.5 - 0.32 * deep, warm = sky.planetHigh * (1 - deep)
    scene.ambientColor = new Color3(amb * (1 + 0.22 * warm), amb * (1 + 0.08 * warm), amb * (1.04 - 0.1 * warm))
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
  // the laser (row 40): a white body with cyan bands, a glowing emitter, and a beam while it cuts
  const laser = new Mesh('laser', scene)
  laser.parent = cam
  for (const [n, size, c, at, e] of [
    ['lgrip', { width: 0.12, height: 0.26, depth: 0.14 }, [0.2, 0.22, 0.26], [0, -0.14, -0.06], 0.2],
    ['lbody', { width: 0.17, height: 0.17, depth: 0.42 }, [0.92, 0.95, 0.98], [0, 0.02, 0.1], 0.35],
    ['lband1', { width: 0.18, height: 0.18, depth: 0.04 }, [0.13, 0.83, 0.93], [0, 0.02, 0.02], 1],
    ['lband2', { width: 0.18, height: 0.18, depth: 0.04 }, [0.13, 0.83, 0.93], [0, 0.02, 0.18], 1],
    ['lfin', { width: 0.03, height: 0.1, depth: 0.2 }, [0.13, 0.83, 0.93], [0, 0.14, 0.08], 0.8],
  ]) {
    const b = MeshBuilder.CreateBox(n, size, scene)
    b.material = mat(n + 'Mat', c, e); b.parent = laser; b.position.set(...at)
  }
  const muzzle = MeshBuilder.CreateCylinder('lmuzzle', { diameter: 0.1, height: 0.14, tessellation: 10 }, scene)
  muzzle.material = mat('lmuzzleMat', [0.4, 1, 1], 1.4); muzzle.parent = laser; muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 0.02, 0.36)
  const beam = MeshBuilder.CreateCylinder('beam', { diameter: 0.09, height: 1, tessellation: 8 }, scene)
  const beamMat = new StandardMaterial('beamMat', scene)
  beamMat.disableLighting = true; beamMat.emissiveColor = new Color3(0.25, 1, 1); beamMat.alpha = 0.9
  beam.material = beamMat; beam.parent = laser; beam.rotation.x = Math.PI / 2
  for (const m of laser.getChildMeshes()) { m.renderingGroupId = 1; m.isPickable = false; noa.rendering.addMeshToScene(m) }
  laser.position.copyFrom(home); laser.scaling.setAll(0.62); laser.rotation.set(0.1, -0.22, 0)
  let tool = 'drill'
  const setTool = name => { tool = name; root.setEnabled(name === 'drill'); laser.setEnabled(name === 'laser') }
  setTool('drill')
  return {
    root, bit, laser, beam, setTool, get tool() { return tool },
    update(t, noa) {
      const v = noa.entities.getPhysics(noa.playerEntity).body.velocity
      const walking = Math.hypot(v[0], v[2]) > 0.5
      const digging = noa.inputs.state.fire && !!noa.targetedBlock
      const bob = walking ? Math.sin(t * 9) * 0.018 : 0
      const buzz = digging ? Math.sin(t * 90) * 0.006 : 0
      const held = tool === 'drill' ? root : laser
      const push = tool === 'drill' && digging ? 0.06 + Math.sin(t * 14) * 0.03 : 0
      held.position.set(home.x + buzz, home.y + bob + buzz, home.z + push)
      bit.rotation.y += digging ? 0.6 : 0.02
      // the beam: from the emitter to the block you aim at
      const on = tool === 'laser' && digging
      beam.setEnabled(on)
      if (on) {
        const d = noa.targetedBlock.position, c = noa.camera.getPosition()
        const reach = Math.max(0.6, Math.hypot(d[0] + 0.5 - c[0], d[1] + 0.5 - c[1], d[2] + 0.5 - c[2]) / 0.62)
        beam.scaling.y = reach
        beam.position.set(0, 0.02, 0.43 + reach / 2)
        beamMat.alpha = 0.7 + 0.25 * Math.sin(t * 40)
      }
    },
  }
}
