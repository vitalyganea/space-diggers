/* The flight between planets, in the game's own world (row 56; the user
   found the first version, emoji on a black screen, flat).

   Lift-off: the camera leaves your eyes and stands back from the launch
   pad; the voxel rocket gives way to a rocket model in its place; its
   engines light (a flame, smoke, a glow, the ground shaking) and it climbs,
   slowly then fast, the camera following it up into the stars. Then the
   screen goes dark with "Loading …" and a bar while the next world is made.
   Landing: the camera above the new pad, the rocket comes down on its
   flame, slowing, and settles; then it is blocks again and you are back in
   your eyes.

   The rocket's blocks are hidden only on the screen while it flies (the
   World's edits are put back after; on lift-off the page reloads first, so
   nothing is saved without them). */
import { MeshBuilder, StandardMaterial, Color3, Color4, Mesh, Vector3, PointLight, ParticleSystem, DynamicTexture, Texture } from '@babylonjs/core'
import { PAD, rocketVoxel } from './town.js'

/* every block of the rocket (not its pad), from the town's own drawing */
function rocketCells() {
  const out = []
  for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) for (let y = 1; y <= 18; y++) {
    const x = PAD.at[0] + dx, z = PAD.at[1] + dz, id = rocketVoxel(x, y, z)
    if (id > 0) out.push([x, y, z, id])
  }
  return out
}
function hideBlocks(world, noa, cells) { for (const [x, y, z] of cells) noa.setBlock(0, x, y, z) }
function showBlocks(world, noa, cells) { for (const [x, y, z] of cells) noa.setBlock(world.get(x, y, z), x, y, z) }

function mat(scene, name, hex, glow = 0) {
  const m = new StandardMaterial(name, scene)
  m.diffuseColor = Color3.FromHexString(hex); m.emissiveColor = Color3.FromHexString(hex).scale(glow); m.specularColor = new Color3(0.4, 0.4, 0.4)
  return m
}

/* A rocket model like the blocks: white body, red bands and nose, four fins, a window, an engine bell. */
function makeRocket(scene, noa) {
  const root = new Mesh('flightRocket', scene)
  const add = m => { m.parent = root; m.isPickable = false; noa.rendering.addMeshToScene(m); return m }
  const white = mat(scene, 'fwhite', '#e8edf3', 0.25), red = mat(scene, 'fred', '#d62f3a', 0.25), grey = mat(scene, 'fgrey', '#6b7280', 0.2)
  const body = add(MeshBuilder.CreateCylinder('fbody', { diameter: 4.4, height: 10.5, tessellation: 16 }, scene)); body.material = white; body.position.y = 6.25
  for (const y of [5.5, 11.5]) { const b = add(MeshBuilder.CreateCylinder('fband', { diameter: 4.5, height: 0.9, tessellation: 16 }, scene)); b.material = red; b.position.y = y }
  const neck = add(MeshBuilder.CreateCylinder('fneck', { diameterTop: 2.2, diameterBottom: 4.4, height: 2.2, tessellation: 16 }, scene)); neck.material = red; neck.position.y = 12.6
  const nose = add(MeshBuilder.CreateCylinder('fnose', { diameterTop: 0, diameterBottom: 2.2, height: 3.4, tessellation: 16 }, scene)); nose.material = red; nose.position.y = 15.4
  for (let k = 0; k < 4; k++) {
    const f = add(MeshBuilder.CreateBox('ffin', { width: 0.4, height: 3.6, depth: 2.2 }, scene)); f.material = red
    const a = k * Math.PI / 2; f.position.set(Math.sin(a) * 2.9, 2.4, Math.cos(a) * 2.9); f.rotation.y = a
  }
  const win = add(MeshBuilder.CreateCylinder('fwin', { diameter: 1.2, height: 0.2, tessellation: 16 }, scene)); win.material = mat(scene, 'fglass', '#7fb6d8', 0.6)
  win.rotation.z = Math.PI / 2; win.position.set(2.22, 9, 0)
  const bell = add(MeshBuilder.CreateCylinder('fbell', { diameterTop: 1.6, diameterBottom: 2.6, height: 1.2, tessellation: 16 }, scene)); bell.material = grey; bell.position.y = 0.6
  // the flame: two cones, a hot core and a softer outside
  const flame = add(MeshBuilder.CreateCylinder('fflame', { diameterTop: 2.2, diameterBottom: 0, height: 4, tessellation: 12 }, scene))
  const fm = mat(scene, 'fflameMat', '#ff8a1f', 1.4); fm.disableLighting = true; fm.alpha = 0.85; flame.material = fm; flame.position.y = -2
  const core = add(MeshBuilder.CreateCylinder('fcore', { diameterTop: 1.2, diameterBottom: 0, height: 2.6, tessellation: 10 }, scene))
  const cm = mat(scene, 'fcoreMat', '#fff3b0', 1.6); cm.disableLighting = true; core.material = cm; core.position.y = -1.3
  return { root, flame, core }
}

/* smoke from the engine: grey puffs that spread and fade */
function makeSmoke(scene, emitter) {
  const tex = new DynamicTexture('puff', { width: 64, height: 64 }, scene, false)
  const g = tex.getContext(), rg = g.createRadialGradient(32, 32, 2, 32, 32, 32)
  rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64); tex.update(); tex.hasAlpha = true
  const ps = new ParticleSystem('smoke', 900, scene)
  ps.particleTexture = tex; ps.emitter = emitter
  ps.minEmitBox = new Vector3(-1.2, -1, -1.2); ps.maxEmitBox = new Vector3(1.2, -1, 1.2)
  ps.color1 = new Color4(0.95, 0.9, 0.85, 0.7); ps.color2 = new Color4(0.75, 0.75, 0.8, 0.6); ps.colorDead = new Color4(0.5, 0.5, 0.55, 0)
  ps.minSize = 1; ps.maxSize = 2.6; ps.minLifeTime = 1; ps.maxLifeTime = 2.2
  ps.emitRate = 0; ps.gravity = new Vector3(0, 0.6, 0)
  ps.direction1 = new Vector3(-6, -2, -6); ps.direction2 = new Vector3(6, -0.5, 6)
  ps.minEmitPower = 1; ps.maxEmitPower = 3; ps.updateSpeed = 0.02
  ps.start()
  return ps
}

/* Shared by both: the camera on an entity of our own, standing off to one
   side like a film camera and always turned to the rocket; the model; the
   fire. The hand (drill or laser) is put away while it plays. */
const VIEW = { side: 4, away: -24, up: 8 }          // south of the pad, out on the open ground
function stage(noa, sound, look) {
  const scene = noa.rendering.getScene()
  const r = makeRocket(scene, noa)
  const nozzle = new Mesh('nozzle', scene); nozzle.parent = r.root; nozzle.position.y = -0.4
  const smoke = makeSmoke(scene, nozzle)
  const light = new PointLight('engineLight', Vector3.Zero(), scene); light.diffuse = new Color3(1, 0.6, 0.25); light.range = 40; light.intensity = 0
  // the camera's spot: south of the pad, away from the base's buildings, a little up
  const spot = [PAD.at[0] + 0.5 + VIEW.side, VIEW.up, PAD.at[1] + 0.5 + VIEW.away]
  const eye = noa.entities.add(spot, 0.1, 0.1, null, null, false, false)
  noa.entities.getPhysics(eye) && (noa.entities.getPhysics(eye).body.gravityMultiplier = 0)
  const ownTarget = noa.camera.cameraTarget
  noa.camera.cameraTarget = eye
  noa.camera.zoomDistance = noa.camera.currentZoom = 0
  const hand = look && look.hand
  if (hand) { hand.root.setEnabled(false); hand.laser.setEnabled(false) }
  let rocketY = 1
  /* turn the camera to the rocket's middle (shake: the engines' rumble) */
  const aim = (shake = 0) => {
    noa.entities.setPosition(eye, [spot[0], spot[1] + shake, spot[2]])
    const dx = PAD.at[0] + 0.5 - spot[0], dz = PAD.at[1] + 0.5 - spot[2], dy = rocketY + 7 - (spot[1] + 1.4)
    noa.camera.heading = Math.atan2(dx, dz)
    noa.camera.pitch = Math.max(-1.35, -Math.atan2(dy, Math.hypot(dx, dz)))
  }
  const place = y => {                                                // the rocket's foot at height y over the pad
    rocketY = y
    const l = noa.globalToLocal([PAD.at[0] + 0.5, y, PAD.at[1] + 0.5], null, [])
    r.root.position.set(l[0], l[1], l[2])
    light.position.set(l[0], l[1] - 1, l[2])
  }
  const fire = (k, t) => {                                            // engine power 0..1, flickering
    const f = k * (0.85 + 0.15 * Math.sin(t * 40) * Math.sin(t * 23))
    r.flame.scaling.set(0.4 + f, 0.3 + f * 1.6, 0.4 + f); r.core.scaling.set(0.4 + f * 0.7, 0.3 + f * 1.4, 0.4 + f * 0.7)
    r.flame.setEnabled(k > 0.02); r.core.setEnabled(k > 0.02)
    smoke.emitRate = rocketY < 10 ? 260 * k : 0; light.intensity = 3 * k             // smoke only off the ground
  }
  const end = () => {
    smoke.stop(); smoke.dispose(); light.dispose()
    r.root.getChildMeshes().forEach(m => m.dispose()); r.root.dispose()
    noa.camera.cameraTarget = ownTarget; noa.camera.zoomDistance = noa.camera.currentZoom = 0
    noa.entities.deleteEntity(eye)
    if (hand) hand.setTool(hand.tool)
  }
  return { r, place, fire, eye, aim, end }
}

/* Lift-off, then "Loading …"; done() when the screen is dark (the caller reloads). */
export function liftOff(noa, world, sound, P, done, look) {
  const cells = rocketCells()
  hideBlocks(world, noa, cells)
  const S = stage(noa, sound, look)
  S.place(1)
  sound.play('rumble')
  let t = 0, y = 1, v = 0, loading = null
  const step = () => {
    const dt = Math.min(0.05, noa.rendering.getScene().getEngine().getDeltaTime() / 1000)
    t += dt
    const ignite = Math.min(1, t / 1.2)
    S.fire(ignite, t)
    if (t > 1.4) { v += dt * (4 + v * 0.9); y += v * dt }                // slow, then faster and faster
    S.place(Math.min(y, 160))
    // the camera stays and looks up after it, shaking with the engines near the ground
    S.aim(y < 12 ? 0.08 * ignite * Math.sin(t * 50) : 0)
    if (t > 1.6 && t < 1.7) sound.play('whoosh')
    if (t > 4.2 && !loading) { loading = loadingScreen(P); setTimeout(() => { done() }, 900) }
    if (!loading || t < 6) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/* The dark screen with "Loading …" and a bar that fills. */
export function loadingScreen(P) {
  const el = document.createElement('div')
  el.className = 'overlay loading-planet'
  el.innerHTML = `<div><small>Flying to</small><b>${P.name}</b><div class="bar"><i></i></div><span>Loading…</span></div>`
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('on'))
  return el
}

/* Landing at this planet's pad; done() when you are back in your eyes. */
export function landing(noa, world, sound, done, look) {
  const cells = rocketCells()
  hideBlocks(world, noa, cells)
  const S = stage(noa, sound, look)
  sound.play('rumble')
  let t = 0
  const T = 5, H = 70
  let frames = 0
  const step = () => {
    const dt = Math.min(0.05, noa.rendering.getScene().getEngine().getDeltaTime() / 1000)
    t += dt
    if (++frames % 10 === 0) hideBlocks(world, noa, cells)          // the new world's chunks are still loading in: keep its blocks out of sight
    const k = Math.min(1, t / T), e = 1 - Math.pow(1 - k, 3)          // fast at first, braking to a soft touch-down
    const y = 1 + H * (1 - e)
    S.place(y)
    S.fire(k < 1 ? 0.5 + 0.5 * (1 - k) : Math.max(0, 1 - (t - T) * 2), t)
    S.aim(y < 6 ? 0.05 * Math.sin(t * 50) : 0)
    if (t < T + 0.8) return requestAnimationFrame(step)
    S.end(); showBlocks(world, noa, cells); done()
  }
  requestAnimationFrame(step)
}
