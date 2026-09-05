import * as THREE from 'three'
import { BOTTLE } from './bottleProfile.js'

const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** The tumbler the bottle pours into. Sits to the bottle's right, on the floor. */
export const GLASS = {
  x: 1.02,
  height: 0.92,
  rBottom: 0.24,
  rTop: 0.3,
  wall: 0.02,
  floor: 0.06,
}

/** Inner radius of the glass at height `y` — the profile its liquid is lathed from. */
export function glassInnerRadius(y) {
  const t = THREE.MathUtils.clamp(y / GLASS.height, 0, 1)
  return THREE.MathUtils.lerp(GLASS.rBottom, GLASS.rTop, t) - GLASS.wall
}

export const MAX_TILT = 1.0 // ~57 degrees, where a real bottle actually pours

/**
 * Where the lip ends up when pouring: just inside the rim, high enough for the
 * stream to be visibly in the air. The bottle is moved to put its lip here
 * rather than being rotated in place, which is the difference between pouring
 * and toppling over.
 */
export const MOUTH_TARGET = new THREE.Vector3(GLASS.x - 0.2, GLASS.height + 0.62, 0)
export const GLASS_FILL_MAX = 0.78

/**
 * One choreography for the whole pour, so the bottle, the cap, the stream, the
 * glass and the splash all read off the same clock and cannot disagree about
 * whether water is currently in the air.
 *
 * Order matters: the cap has to be off before the bottle tips, the stream must
 * not exist before the mouth is over the glass, and the glass has to keep
 * filling for a beat after the stream stops — that trailing water is what makes
 * it look like liquid with momentum rather than a level being set.
 */
export function pourPhases(p) {
  const glassIn = smoothstep(0.0, 0.12, p)
  const capOff = smoothstep(0.06, 0.2, p) * (1 - smoothstep(0.82, 0.94, p))
  const tilt = smoothstep(0.14, 0.32, p) * (1 - smoothstep(0.72, 0.86, p))
  const flow = smoothstep(0.28, 0.36, p) * (1 - smoothstep(0.68, 0.74, p))

  return {
    glassIn,
    capOff,
    tilt,
    flow,
    /** Bottle level: drains only. It is pouring, not cycling. */
    bottleFill: THREE.MathUtils.lerp(0.72, 0.04, smoothstep(0.3, 0.72, p)),
    /** Glass level, lagging the stream slightly at both ends. */
    glassFill: smoothstep(0.33, 0.78, p) * GLASS_FILL_MAX,
  }
}

/**
 * Where the lip sits in the bottle's own space. Deliberately on the axis: the
 * page spins the bottle about Y throughout, and an off-axis pivot would walk
 * the lip in a circle away from the glass mid-pour.
 */
export const MOUTH_LOCAL = new THREE.Vector3(0, BOTTLE.neckTop, 0)
