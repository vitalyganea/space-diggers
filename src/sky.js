/* The sky of the Moon (row 36). The user saw the old one, everything
   painted on one picture wrapped round a sphere, stretch and bend at the
   edge of the world. Now only the soft things are painted on the dome (the
   dark gradient and the nebula, which can stretch without showing it);
   everything sharp is its own object, the same size from any angle:
     stars       points of light, a fixed size in pixels; the bright ones twinkle
     the ringed planet and the Earth
                 billboards, drawn crisp, with a glow behind
     shooting stars
                 now and then a streak across the sky
   All of it rides with the camera (infiniteDistance), so it is never
   reached, and the dome turns very slowly. noa moves every mesh when it
   shifts the world's origin (every few dozen blocks you travel), sky and
   all: that was the old sky sliding away "at the edge of the map". So the
   sky is put back in place every frame. */
import {
  Mesh, MeshBuilder, StandardMaterial, Color3, Color4, Vector3, VertexData, DynamicTexture, Texture,
} from '@babylonjs/core'

const R = 180                                 // how far off the sky things hang (inside the dome's 200)
/* a direction from a compass heading (0 is +z, π/2 is +x) and an elevation, both in radians */
export function skyDir(heading, elev) {
  return new Vector3(Math.sin(heading) * Math.cos(elev), Math.sin(elev), Math.cos(heading) * Math.cos(elev))
}
export const PLANET = { heading: -2.25, elev: 0.33, size: 200 }      // the ringed planet, where it starts: low in the south-west
/* Row 37: it goes once round the sky in DAY seconds, rising and sinking
   between LOW and HIGH (never under the horizon, so it is always there to
   see), and the higher it is the warmer the Moon's light. */
export const DAY = 24 * 60
const LOW = 0.14, HIGH = 0.8
export function planetAt(time) {
  const ph = (time / DAY) * Math.PI * 2
  return { heading: PLANET.heading + ph, elev: LOW + (HIGH - LOW) * (0.5 - 0.5 * Math.cos(ph * 2 + 1.2)) }
}
export const EARTH = { heading: 1.05, elev: 0.68, size: 26 }

/* opts (a planet's sky, src/planets.js): { planetSize, planetElev, nebula, earth } */
export function makeSky(noa, opts = {}) {
  const scene = noa.rendering.getScene()
  let seed = 11
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const add = m => { m.isPickable = false; m.infiniteDistance = true; noa.rendering.addMeshToScene(m); return m }

  // the dome: only the gradient and the nebula
  const dome = add(MeshBuilder.CreateSphere('sky', { diameter: 400, segments: 24, sideOrientation: Mesh.BACKSIDE }, scene))
  const domeMat = new StandardMaterial('skyMat', scene)
  domeMat.disableLighting = true
  domeMat.emissiveTexture = paintNebula(scene, rnd, opts.nebula)
  domeMat.diffuseColor = new Color3(0, 0, 0)
  domeMat.specularColor = new Color3(0, 0, 0)
  domeMat.fogEnabled = false
  dome.material = domeMat

  // stars: two point clouds, many faint ones and a few bright ones that twinkle
  const starMesh = (name, n, size, bright) => {
    const pos = [], col = [], ind = [], base = []
    for (let i = 0; i < n; i++) {
      let d
      do { d = new Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1) } while (d.length() > 1 || d.length() < 0.1 || d.y < -0.08)
      d.normalize().scaleInPlace(R)
      pos.push(d.x, d.y, d.z)
      const tint = [[1, 1, 1], [0.75, 0.86, 1], [1, 0.94, 0.62], [1, 0.8, 0.8]][Math.floor(rnd() * 4)]
      const b = bright ? 1 : 0.35 + rnd() * 0.55
      base.push(b); col.push(tint[0] * b, tint[1] * b, tint[2] * b, 1); ind.push(i)
    }
    const m = new Mesh(name, scene)
    const vd = new VertexData(); vd.positions = pos; vd.colors = col; vd.indices = ind
    vd.applyToMesh(m, true)
    const mat = new StandardMaterial(name + 'Mat', scene)
    mat.disableLighting = true; mat.emissiveColor = new Color3(1, 1, 1); mat.pointsCloud = true; mat.pointSize = size; mat.fogEnabled = false
    m.material = mat; m.useVertexColors = true
    m.alwaysSelectAsActiveMesh = true
    return { mesh: add(m), col, base }
  }
  const faint = starMesh('stars', 1700, 1.6, false)
  const bright = starMesh('brightStars', 140, 3, true)

  // the ringed planet and the Earth: crisp billboards, a soft glow round each
  const billboard = (name, o, draw, px) => {
    const tex = new DynamicTexture(name + 'Tex', { width: px, height: px }, scene, true, Texture.TRILINEAR_SAMPLINGMODE)
    draw(tex.getContext(), px, rnd); tex.update(); tex.hasAlpha = true
    const mat = new StandardMaterial(name + 'Mat', scene)
    mat.disableLighting = true; mat.emissiveTexture = tex; mat.diffuseTexture = tex; mat.useAlphaFromDiffuseTexture = true
    mat.diffuseColor = new Color3(0, 0, 0); mat.specularColor = new Color3(0, 0, 0); mat.fogEnabled = false; mat.backFaceCulling = false
    const m = MeshBuilder.CreatePlane(name, { size: o.size }, scene)
    m.material = mat; m.billboardMode = Mesh.BILLBOARDMODE_ALL
    m.home = skyDir(o.heading, o.elev).scale(R - 15)
    m.position.copyFrom(m.home)
    return add(m)
  }
  // seen from one of its own moons, the ringed planet looms larger (row 55)
  const planet = billboard('planet', { ...PLANET, size: opts.planetSize || PLANET.size }, drawRinged, 1024)
  const earth = billboard('earth', EARTH, drawEarth, 256)
  if (opts.earth === false) earth.visibility = 0

  // shooting stars: one at a time, every 6–16 s, a streak that fades in 0.8 s
  const streakPts = [Vector3.Zero(), Vector3.Zero()]
  let streak = add(MeshBuilder.CreateLines('shootingStar', { points: streakPts, updatable: true }, scene))
  streak.color = new Color3(1, 1, 1); streak.alpha = 0
  let nextShoot = 4 + rnd() * 8, shoot = null

  let t = 0
  return {
    dome, stars: faint.mesh, brightStars: bright.mesh, planet, earth, streak,
    shootingStars: 0, planetHigh: 0,
    /* jump the clock (tests, and so a new game need not start at dawn) */
    setTime(v) { t = v },
    update(dt, deep) {
      const s = dt / 1000
      t += s
      const on = deep < 0.99
      for (const m of [dome, faint.mesh, bright.mesh, planet, earth, streak]) m.setEnabled(on)
      if (!on) return
      for (const m of [dome, faint.mesh, bright.mesh, streak]) m.position.setAll(0)   // undo noa's origin shifts
      const pa = planetAt(t); pa.elev += opts.planetElev || 0
      planet.home = skyDir(pa.heading, pa.elev).scale(R - 15)
      this.planetHigh = (pa.elev - LOW) / (HIGH - LOW)                // 0 low on the horizon, 1 at its highest
      planet.position.copyFrom(planet.home); earth.position.copyFrom(earth.home)
      dome.rotation.y = t * 0.002
      faint.mesh.rotation.y = bright.mesh.rotation.y = t * 0.002
      // twinkle: each bright star's brightness wanders
      const c = bright.col
      for (let i = 0; i < bright.base.length; i++) {
        const k = 0.55 + 0.45 * Math.sin(t * (1.3 + (i % 7) * 0.37) + i * 2.1)
        c[i * 4] = c[i * 4 + 1] = c[i * 4 + 2] = k
      }
      bright.mesh.setVerticesData('color', c, true)
      // a shooting star
      nextShoot -= s
      if (!shoot && nextShoot <= 0) {
        const h = rnd() * Math.PI * 2, e = 0.45 + rnd() * 0.6
        shoot = { from: skyDir(h, e), along: skyDir(h + 0.5 + rnd() * 0.4, e - 0.15 - rnd() * 0.2), age: 0 }
        this.shootingStars++
      }
      if (shoot) {
        shoot.age += s
        const k = shoot.age / 0.8
        const head = Vector3.Lerp(shoot.from, shoot.along, Math.min(1, k * 1.2)).normalize().scale(R - 5)
        const tail = Vector3.Lerp(shoot.from, shoot.along, Math.max(0, k * 1.2 - 0.25)).normalize().scale(R - 5)
        streak = MeshBuilder.CreateLines('shootingStar', { points: [tail, head], instance: streak })
        streak.alpha = Math.max(0, 1 - Math.abs(k - 0.4) * 1.6)
        if (k >= 1) { shoot = null; streak.alpha = 0; nextShoot = 6 + rnd() * 10 }
      }
      // the planet's glow breathes, very gently
      planet.visibility = 0.96 + 0.04 * Math.sin(t * 0.4)
    },
  }
}

/* The dome's picture: soft only. Black overhead, a deep blue haze at the
   horizon, clouds of nebula along a band that climbs across the sky. A 2:1
   canvas, u round the horizon, painted flipped (the dome shows v upside
   down), the nebula wrapped so the seam does not show. */
function paintNebula(scene, rnd, tint = null) {
  const W = 1024, H = 512
  const tex = new DynamicTexture('skyTex', { width: W, height: H }, scene, true)
  const g = tex.getContext()
  const yOf = elev => H / 2 + elev / 90 * (H / 2)
  const bg = g.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#020309'); bg.addColorStop(0.5, '#0d1430'); bg.addColorStop(0.58, '#060a1c'); bg.addColorStop(1, '#020309')
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  for (let k = 0; k < 46; k++) {
    const x = rnd() * W, y = yOf(25 + 35 * Math.sin(x / W * Math.PI * 2)) + (rnd() - 0.5) * 80
    const r = 30 + rnd() * 85
    const hex = tint && k % 2 === 0 ? tint : null               // a planet's own tint in half the clouds
    const col = hex ? [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',') : ['168,85,247', '236,72,153', '56,189,248', '99,102,241'][k % 4]
    const n = g.createRadialGradient(x, y, 0, x, y, r)
    n.addColorStop(0, `rgba(${col},${0.10 + rnd() * 0.08})`); n.addColorStop(1, `rgba(${col},0)`)
    g.fillStyle = n
    for (const dx of [-W, 0, W]) { g.save(); g.translate(dx, 0); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore() }
  }
  tex.update()
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  return tex
}

/* A planet lit from the left: colour, bands or land, a shadow on the
   right, a glow of atmosphere, and for the big one a tilted ring that goes
   behind it and in front. Centred on a transparent square canvas. */
function drawPlanet(g, px, r, cols, rings, rnd) {
  const x = px / 2, y = px / 2
  g.clearRect(0, 0, px, px)
  // glow
  const halo = g.createRadialGradient(x, y, r * 0.9, x, y, r * 1.45)
  halo.addColorStop(0, rings ? 'rgba(253,186,116,0.38)' : 'rgba(125,211,252,0.5)'); halo.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * 1.45, 0, Math.PI * 2); g.fill()
  /* The ring goes behind the planet whole (one closed loop: drawn as two
     halves, their square ends met in a hairline gap at either side, the
     "two black lines" the user saw), then the near half over the planet,
     exactly on top of the same loop. Opaque colours, so the double layer
     where they overlap looks the same as one. */
  const ring = front => {
    g.save(); g.translate(x, y); g.rotate(-0.32); g.scale(1, 0.24)
    const a0 = front ? 0 : 0, a1 = front ? Math.PI : Math.PI * 2
    g.lineCap = 'round'
    g.beginPath(); g.arc(0, 0, r * 1.85, a0, a1)
    g.lineWidth = r * 0.5; g.strokeStyle = '#d8c7a6'; g.stroke()
    g.lineWidth = r * 0.1; g.strokeStyle = '#9a7c5c'; g.stroke()
    g.lineWidth = r * 0.03; g.strokeStyle = '#f3e9d6'; g.beginPath(); g.arc(0, 0, r * 2.02, a0, a1); g.stroke()
    g.restore()
  }
  if (rings) ring(false)
  g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip()
  g.fillStyle = cols[0]; g.fillRect(x - r, y - r, r * 2, r * 2)
  if (rings) for (let k = 0; k < 11; k++) {
    g.fillStyle = cols[1 + (k % 3)]; g.globalAlpha = 0.5
    g.fillRect(x - r, y - r + (k + rnd() * 0.5) * r * 0.19, r * 2, r * (0.05 + rnd() * 0.09))
  } else for (let k = 0; k < 9; k++) {
    g.fillStyle = cols[2 + (k % 2)]; g.globalAlpha = 0.85
    g.beginPath(); g.arc(x + (rnd() - 0.5) * r * 1.4, y + (rnd() - 0.5) * r * 1.4, r * (0.12 + rnd() * 0.28), 0, Math.PI * 2); g.fill()
  }
  g.globalAlpha = 1
  const sh = g.createRadialGradient(x - r * 0.45, y - r * 0.35, r * 0.2, x, y, r * 1.15)
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.6, 'rgba(0,0,0,0.15)'); sh.addColorStop(1, 'rgba(0,0,8,0.85)')
  g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2)
  g.restore()
  if (rings) ring(true)
}
const drawRinged = (g, px, rnd) => drawPlanet(g, px, px * 0.2, ['#f4c58b', '#e3a466', '#c97f4a', '#f0d2a8'], true, rnd)
const drawEarth = (g, px, rnd) => drawPlanet(g, px, px * 0.3, ['#3b82f6', '#2563eb', '#22c55e', '#e0f2fe'], false, rnd)
