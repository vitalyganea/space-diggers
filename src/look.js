/* The look: the sky of space, fog, light by depth, the helmet lamp, and
   the drill in your hand. Everything here is only looked at; none of it
   changes play.

   On the Moon the sky is black even by day (row 26): a dome painted with
   stars, a band of nebula, a big ringed planet over the horizon and the
   small blue Earth far off. The sun is hard and white, from high in the
   south-west, so tops, sides and the faces turned away read three
   different brightnesses; fog fades the far ground into the dark, which
   also hides where the loaded world ends. Going down, light and fog close
   in towards black (fully by DARK_AT), and a lamp on your helmet lights
   the few blocks around you, which is what you dig by. */
import {
  MeshBuilder, StandardMaterial, Color3, Color4, Vector3, PointLight, Mesh, Texture, DynamicTexture,
} from '@babylonjs/core'

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

  // the sky: a big dome painted inside with the starfield, kept round the camera
  const dome = MeshBuilder.CreateSphere('sky', { diameter: 400, segments: 32, sideOrientation: Mesh.BACKSIDE }, scene)
  const skyTex = paintSky(scene)
  const skyMat = new StandardMaterial('skyMat', scene)
  skyMat.disableLighting = true
  skyMat.emissiveTexture = skyTex
  skyMat.diffuseColor = new Color3(0, 0, 0)
  skyMat.specularColor = new Color3(0, 0, 0)
  skyMat.fogEnabled = false
  dome.material = skyMat
  dome.infiniteDistance = true
  dome.isPickable = false
  noa.rendering.addMeshToScene(dome)

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
    const sky = mix(SKY_LOW, DEEP, deep)
    scene.clearColor = new Color4(sky[0], sky[1], sky[2], 1)
    scene.fogColor = new Color3(sky[0], sky[1], sky[2])
    scene.fogStart = 34 - 26 * deep
    scene.fogEnd = 72 - 50 * deep
    light.intensity = 1 - 0.85 * deep
    const amb = 0.5 - 0.32 * deep
    scene.ambientColor = new Color3(amb, amb, amb * 1.04)
    dome.setEnabled(deep < 0.99)
    lamp.intensity = 0.25 + 1.1 * deep
    lamp.position.copyFrom(cam.globalPosition)
    dome.rotation.y = t * 0.002                                    // the stars turn, very slowly
    if (hand) hand.update(t, noa)
  })
  return { lamp, dome, hand }
}

/* The starfield, on a 2:1 canvas wrapped round the dome (u round the
   horizon, v from the bottom up; the horizon is the middle). Seeded, so
   the sky is the same every time. */
function paintSky(scene) {
  const W = 2048, H = 1024
  const tex = new DynamicTexture('skyTex', { width: W, height: H }, scene, false)   // no mipmaps: they wash the stars out
  const g = tex.getContext()
  let seed = 11
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const yOf = elev => H / 2 + elev / 90 * (H / 2)                  // elevation in degrees to canvas y (the dome shows it flipped)
  // black overhead, a deep blue haze down at the horizon
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#020309'); bg.addColorStop(0.5, '#0d1430'); bg.addColorStop(0.58, '#060a1c'); bg.addColorStop(1, '#020309')
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  // the nebula: soft clouds of colour along a band that climbs across the sky
  for (let k = 0; k < 46; k++) {
    const u = rnd() * W, x = u, y = yOf(25 + 35 * Math.sin(u / W * Math.PI * 2)) + (rnd() - 0.5) * 160
    const r = 60 + rnd() * 170
    const col = ['168,85,247', '236,72,153', '56,189,248', '99,102,241'][k % 4]
    const n = g.createRadialGradient(x, y, 0, x, y, r)
    n.addColorStop(0, `rgba(${col},${0.10 + rnd() * 0.08})`); n.addColorStop(1, `rgba(${col},0)`)
    g.fillStyle = n
    for (const dx of [-W, 0, W]) { g.save(); g.translate(dx, 0); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore() }   // wrapped, so no seam
  }
  // stars, more of them dim, a few bright with a glow; none below the horizon
  for (let k = 0; k < 2600; k++) {
    const x = rnd() * W, y = yOf(rnd() * rnd() < 0.5 ? 2 + rnd() * 88 : 2 + rnd() * 30)
    const b = rnd()
    const tint = ['255,255,255', '191,219,254', '254,240,138', '254,202,202'][Math.floor(rnd() * 4)]
    if (b > 0.985) {
      const gl = g.createRadialGradient(x, y, 0, x, y, 7)
      gl.addColorStop(0, `rgba(${tint},0.9)`); gl.addColorStop(1, `rgba(${tint},0)`)
      g.fillStyle = gl; g.fillRect(x - 7, y - 7, 14, 14)
      g.fillStyle = '#fff'; g.fillRect(x - 1, y - 1, 3, 3)
    } else {
      g.fillStyle = `rgba(${tint},${0.5 + b * 0.5})`
      const s = b > 0.7 ? 3 : 2
      g.fillRect(x, y, s, s)
    }
  }
  // the big ringed planet, low over the horizon
  planet(g, W * 0.30, yOf(20), 92, ['#f4c58b', '#e3a466', '#c97f4a', '#f0d2a8'], true, rnd)
  // and the Earth, small and far
  planet(g, W * 0.78, yOf(38), 30, ['#3b82f6', '#2563eb', '#22c55e', '#e0f2fe'], false, rnd)
  tex.update()
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  return tex
}

/* A planet lit from the left: bands of colour, a shadow on the right, and
   (if `rings`) a tilted ring that passes behind it and in front. */
function planet(g, x, y, r, cols, rings, rnd) {
  const ring = (front) => {
    g.save(); g.translate(x, y); g.rotate(-0.32); g.scale(1, 0.24)
    g.beginPath(); g.arc(0, 0, r * 1.9, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2)
    g.lineWidth = r * 0.5; g.strokeStyle = 'rgba(233,213,180,0.75)'; g.stroke()
    g.lineWidth = r * 0.12; g.strokeStyle = 'rgba(120,90,60,0.55)'; g.stroke()
    g.restore()
  }
  if (rings) ring(false)
  g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip()
  g.fillStyle = cols[0]; g.fillRect(x - r, y - r, r * 2, r * 2)
  if (rings) for (let k = 0; k < 9; k++) {                       // gas bands
    g.fillStyle = cols[1 + (k % 3)]; g.globalAlpha = 0.55
    g.fillRect(x - r, y - r + (k + rnd() * 0.5) * r * 0.22, r * 2, r * (0.06 + rnd() * 0.1))
  } else for (let k = 0; k < 7; k++) {                           // land and cloud
    g.fillStyle = cols[2 + (k % 2)]; g.globalAlpha = 0.85
    g.beginPath(); g.arc(x + (rnd() - 0.5) * r * 1.4, y + (rnd() - 0.5) * r * 1.4, r * (0.15 + rnd() * 0.3), 0, Math.PI * 2); g.fill()
  }
  g.globalAlpha = 1
  const sh = g.createRadialGradient(x - r * 0.45, y - r * 0.35, r * 0.2, x, y, r * 1.15)
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.6, 'rgba(0,0,0,0.15)'); sh.addColorStop(1, 'rgba(0,0,8,0.85)')
  g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2)
  g.restore()
  // a thin glow of atmosphere round the edge
  const glow = g.createRadialGradient(x, y, r * 0.95, x, y, r * 1.25)
  glow.addColorStop(0, rings ? 'rgba(253,186,116,0.35)' : 'rgba(125,211,252,0.45)'); glow.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = glow; g.beginPath(); g.arc(x, y, r * 1.25, 0, Math.PI * 2); g.fill()
  if (rings) ring(true)
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
