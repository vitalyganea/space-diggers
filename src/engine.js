import { Engine } from 'noa-engine'

/* One noa engine with Boom Diggers' settings. First person (zoom 0), the
   mouse locked to the canvas on the first click, and a reach of six blocks
   for digging and placing. */
export function createEngine(opts = {}) {
  const noa = new Engine(Object.assign({
    debug: false,
    showFPS: false,
    chunkSize: 32,
    chunkAddDistance: [2.5, 2],
    chunkRemoveDistance: [3.5, 3],
    blockTestDistance: 6,
    playerStart: [0.5, 2, 0.5],
    playerHeight: 1.6,
    playerWidth: 0.6,
    initialZoom: 0,
    stickyPointerLock: true,
    dragCameraOutsidePointerLock: true,
    texturePath: '',
  }, opts))
  // a brisk walk and a jump that clears one block, Bloxd-like
  const move = noa.entities.getMovement(noa.playerEntity)
  move.maxSpeed = 6.5
  move.jumpImpulse = 7.5
  return noa
}

/* Where the player is and what they are doing, for the HUD and the tests. */
export function playerState(noa) {
  const p = noa.entities.getPosition(noa.playerEntity)
  const body = noa.entities.getPhysics(noa.playerEntity).body
  return {
    x: +p[0].toFixed(2), y: +p[1].toFixed(2), z: +p[2].toFixed(2),
    onGround: body.resting[1] < 0,
    heading: +noa.camera.heading.toFixed(3), pitch: +noa.camera.pitch.toFixed(3),
    locked: !!document.pointerLockElement,
  }
}
