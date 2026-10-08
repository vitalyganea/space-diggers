/* The look: sky, clouds, fog, light by depth, the miner's lamp, and the
   drill in your hand. Everything here is only looked at; none of it
   changes play.

   Above ground the sky is a bright gradient with blocky clouds drifting
   over it and the light comes from high in the south-west, so tops, sides
   and the faces turned away read three different brightnesses. Going down,
   sky, fog and daylight fade towards a deep brown-black (fully by
   DARK_AT), and a warm lamp on the miner's helmet lights the few blocks
   around them, which is what you dig by. */
import {
  MeshBuilder, StandardMaterial, Color3, Color4, Vector3, PointLight, Mesh, Texture, DynamicTexture,
} from '@babylonjs/core'

const DARK_AT = -40
const SKY_TOP = [0.36, 0.62, 0.98], SKY_LOW = [0.72, 0.86, 1.0]
const DEEP = [0.07, 0.05, 0.05]
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

export function applyLook(noa, { drill = true } = {}) {
  const scene = noa.rendering.getScene()
  const cam = noa.rendering.camera

  // light: noa's single directional light, from high in the south-west
  const light = noa.rendering.light
  light.direction = new Vector3(0.45, -1, 0.65)
  scene.ambientColor = new Color3(0.62, 0.62, 0.66)

  // fog that hides where the loaded world ends
  scene.fogMode = 3                                    // linear
  scene.fogStart = 34
  scene.fogEnd = 72

  // the sky: a big dome, vertex coloured top to horizon, kept round the camera
  const dome = MeshBuilder.CreateSphere('sky', { diameter: 400, segments: 12, sideOrientation: Mesh.BACKSIDE }, scene)
  const skyMat = new StandardMaterial('skyMat', scene)
  skyMat.disableLighting = true
  skyMat.emissiveColor = new Color3(1, 1, 1)       // times the vertex colours below
  skyMat.diffuseColor = new Color3(0, 0, 0)
  skyMat.fogEnabled = false
  dome.material = skyMat
  dome.infiniteDistance = true
  dome.isPickable = false
  const pos = dome.getVerticesData('position')
  const cols = []
  for (let i = 0; i < pos.length; i += 3) {
    const t = Math.max(0, Math.min(1, pos[i + 1] / 200 + 0.15))
    const c = mix(SKY_LOW, SKY_TOP, t)
    cols.push(c[0], c[1], c[2], 1)
  }
  dome.setVerticesData('color', cols)
  dome.useVertexColors = true
  noa.rendering.addMeshToScene(dome)

  // blocky clouds: a pixel texture on a wide plane high above, drifting
  const ct = new DynamicTexture('clouds', { width: 64, height: 64 }, scene, false, Texture.NEAREST_SAMPLINGMODE)
  const g = ct.getContext()
  g.clearRect(0, 0, 64, 64)
  let seed = 3
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  g.fillStyle = 'rgba(255,255,255,0.92)'
  for (let k = 0; k < 14; k++) {
    const x = Math.floor(rnd() * 60), y = Math.floor(rnd() * 60), w = 4 + Math.floor(rnd() * 9), h = 2 + Math.floor(rnd() * 5)
    g.fillRect(x, y, w, h); g.fillRect(x + 2, y - 1, w - 4, h + 2)
  }
  ct.update()
  ct.hasAlpha = true
  ct.wrapU = ct.wrapV = Texture.WRAP_ADDRESSMODE
  ct.uScale = ct.vScale = 3
  const cloudMat = new StandardMaterial('cloudMat', scene)
  cloudMat.diffuseTexture = ct
  cloudMat.useAlphaFromDiffuseTexture = true
  cloudMat.disableLighting = true
  cloudMat.emissiveColor = new Color3(1, 1, 1)
  cloudMat.fogEnabled = false
  cloudMat.backFaceCulling = false
  const clouds = MeshBuilder.CreateGround('clouds', { width: 600, height: 600 }, scene)
  clouds.material = cloudMat
  clouds.isPickable = false
  noa.rendering.addMeshToScene(clouds, false, [0, 70, 0])

  // the miner's lamp
  const lamp = new PointLight('lamp', new Vector3(0, 0, 0), scene)
  lamp.diffuse = new Color3(1, 0.86, 0.62)
  lamp.specular = new Color3(0, 0, 0)
  lamp.range = 9
  lamp.intensity = 0

  const hand = drill ? makeDrill(scene, cam, noa) : null
  let t = 0, cloudShift = 0
  noa.on('beforeRender', dt => {
    t += dt / 1000
    const p = noa.entities.getPosition(noa.playerEntity)
    const deep = Math.max(0, Math.min(1, -p[1] / -DARK_AT))       // 0 at the surface, 1 by DARK_AT
    const sky = mix(SKY_LOW, DEEP, deep)
    scene.clearColor = new Color4(sky[0], sky[1], sky[2], 1)
    scene.fogColor = new Color3(sky[0], sky[1], sky[2])
    scene.fogStart = 34 - 26 * deep
    scene.fogEnd = 72 - 50 * deep
    light.intensity = 1 - 0.85 * deep
    const amb = 0.62 - 0.42 * deep
    scene.ambientColor = new Color3(amb, amb, amb * 1.04)
    dome.setEnabled(deep < 0.99)
    clouds.setEnabled(deep < 0.5)
    lamp.intensity = 0.25 + 1.1 * deep
    lamp.position.copyFrom(cam.globalPosition)
    // clouds drift and stay overhead
    cloudShift += dt / 1000 * 0.004
    ct.uOffset = cloudShift
    const local = noa.globalToLocal([p[0], 70, p[2]], null, [])
    clouds.position.set(local[0], local[1], local[2])
    if (hand) hand.update(t, noa)
  })
  return { lamp, dome, clouds, hand }
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
