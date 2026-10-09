/* Charging the drill (row 33, asked for by the user): fast on the charging
   pad in the middle of the base, very slowly everywhere else, the surface
   included. A ticket home lands you on the pad.

   Flat and deep down, the trickle waits: the stranded card's choices (pay,
   send the robot, an ad, the free rescue, a ticket) are the way out there,
   so a child can always get home without waiting minutes on a trickle. */
import { SURFACE_DEPTH } from './stranded.js'

export const PAD_R = 1                     // the pad: the 3×3 blocks round the base's middle block
export const STATION_RATE = 0.25           // of a full battery per second: empty to full in 4 s
export const TRICKLE_RATE = 0.004          // elsewhere: empty to full in about 4 minutes

/* Standing on the pad: feet on its blocks (y 1, the deck's top) */
export function onPad(pos) {
  const x = Math.floor(pos[0]), z = Math.floor(pos[2])
  return Math.abs(x) <= PAD_R && Math.abs(z) <= PAD_R && pos[1] >= 0.9 && pos[1] < 2
}

/* Charge per second, as a share of the battery, at `pos` and `depth`. */
export function chargeRate(pos, depth, flat) {
  if (onPad(pos)) return STATION_RATE
  if (flat && depth >= SURFACE_DEPTH) return 0
  return TRICKLE_RATE
}
