/* A flat portrait of an animal for the shop, drawn from the same colours
   as its 3D model (src/animals.js): face, ears, eyes, nose or snout, teeth
   or cheeks, and the crew's yellow helmet with its lamp. */
import { ANIMALS } from '../animals.js'

export function portrait(kind, size = 96) {
  const A = ANIMALS[kind]
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const u = size / 24                                        // a 24-unit grid
  const box = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x * u), Math.round(y * u), Math.ceil(w * u), Math.ceil(h * u)) }
  g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.fill()
  box(4, 9, 3, 3, A.ear); box(17, 9, 3, 3, A.ear)          // ears
  box(5, 8, 14, 13, A.body)                                // face
  box(4, 5, 16, 4, '#f5c518'); box(3, 8, 18, 1.4, '#e0b015') // helmet and brim
  box(10.5, 5.6, 3, 2.4, '#fff6c8')                        // lamp
  const eye = A.snout ? 1.4 : 2.2
  box(8, 11, eye, eye, A.eye); box(16 - eye, 11, eye, eye, A.eye)
  if (A.cheeks) { box(3.5, 14, 4, 4, A.cheeks); box(16.5, 14, 4, 4, A.cheeks) }
  if (A.snout) { box(9, 14, 6, 4.5, A.nose); box(10, 14, 4, 2, '#e0708f') }
  else box(10.8, 14, 2.4, 1.6, A.nose)
  if (A.teeth) box(10.6, 16.5, 2.8, 2.6, A.teeth)
  box(7, 18.5, 10, 2.5, A.belly)                           // chin
  return c
}
