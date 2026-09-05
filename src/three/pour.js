import * as THREE from 'three'
import { BOTTLE, fillHeight, innerRadius } from './bottleProfile.js'

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

/**
 * Cumulative volume of a lathed vessel, sampled up its height.
 *
 * Levels cannot simply be lerped between two heights if the water is supposed
 * to be conserved: the bottle is a wide barrel and the glass is a narrow taper,
 * so the same volume is a very different number of millimetres in each. Solving
 * through volume is what makes the bottle's level fall at the rate the glass's
 * level rises.
 */
function volumeTable(y0, y1, radiusFn, steps = 160) {
  const heights = new Float64Array(steps + 1)
  const volumes = new Float64Array(steps + 1)
  const dy = (y1 - y0) / steps
  let v = 0
  for (let i = 0; i <= steps; i++) {
    const y = y0 + dy * i
    if (i > 0) {
      const a = radiusFn(y - dy)
      const b = radiusFn(y)
      // Trapezoid on r², which is the exact integral for a linear radius.
      v += Math.PI * ((a * a + b * b) / 2) * dy
    }
    heights[i] = y
    volumes[i] = v
  }
  return { heights, volumes, total: v }
}

function volumeAtHeight(table, y) {
  const { heights, volumes } = table
  if (y <= heights[0]) return 0
  const last = heights.length - 1
  if (y >= heights[last]) return volumes[last]
  const span = (heights[last] - heights[0]) / last
  const i = Math.min(Math.floor((y - heights[0]) / span), last - 1)
  const t = (y - heights[i]) / (heights[i + 1] - heights[i])
  return THREE.MathUtils.lerp(volumes[i], volumes[i + 1], t)
}

function heightAtVolume(table, volume) {
  const { heights, volumes } = table
  const last = volumes.length - 1
  if (volume <= 0) return heights[0]
  if (volume >= volumes[last]) return heights[last]
  let lo = 0
  let hi = last
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (volumes[mid] > volume) hi = mid
    else lo = mid
  }
  const t = (volume - volumes[lo]) / (volumes[hi] - volumes[lo] || 1)
  return THREE.MathUtils.lerp(heights[lo], heights[hi], t)
}

/** How full the glass ends up. Declared before the tables that consume it. */
export const GLASS_FILL_MAX = 0.78

const BOTTLE_VOLUME = volumeTable(BOTTLE.fillMin, BOTTLE.fillMax, innerRadius)
const GLASS_VOLUME = volumeTable(GLASS.floor, GLASS.height, glassInnerRadius)

/** Level the bottle starts the pour at, and how much of it leaves. */
const START_FILL = 0.72
const START_VOLUME = volumeAtHeight(BOTTLE_VOLUME, fillHeight(START_FILL))
const POURED_SHARE = 0.92
/** The glass is far smaller than 750 ml, so the transfer is scaled to fit it. */
const TRANSFER =
  (GLASS_VOLUME.total * GLASS_FILL_MAX) / (START_VOLUME * POURED_SHARE)

export const MAX_TILT = 1.0 // ~57 degrees, where a real bottle actually pours

/**
 * Where the lip ends up when pouring: just inside the rim, high enough for the
 * stream to be visibly in the air. The bottle is moved to put its lip here
 * rather than being rotated in place, which is the difference between pouring
 * and toppling over.
 */
export const MOUTH_TARGET = new THREE.Vector3(GLASS.x - 0.2, GLASS.height + 0.62, 0)

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
  const glassIn = smoothstep(0.0, 0.1, p)
  // Beats, in order, each with room to be watched: the glass arrives, the cap
  // comes off, the bottle tips, then it pours. The cap is fully clear before
  // the tilt starts — overlapping the two made the cap tip along with the
  // bottle, which is what read as it sliding around inside the neck.
  const capOff = smoothstep(0.05, 0.24, p) * (1 - smoothstep(0.86, 0.96, p))
  const tilt = smoothstep(0.28, 0.44, p) * (1 - smoothstep(0.74, 0.88, p))
  // Kept as two halves as well as their product. A stream does not fade in
  // uniformly: it starts at the lip and the head falls to the glass, and when
  // it stops the tail drains downward from the lip. Thinning the whole rod at
  // once is the thing that reads as an object being scaled.
  const flowOn = smoothstep(0.4, 0.47, p)
  const flowOff = smoothstep(0.72, 0.78, p)
  const flow = flowOn * (1 - flowOff)

  // One driver for both vessels. The glass runs very slightly behind the bottle
  // because the water it is gaining is still in the air.
  const poured = smoothstep(0.42, 0.76, p)
  const landed = smoothstep(0.45, 0.79, p)

  const leftInBottle = START_VOLUME * (1 - poured * POURED_SHARE)
  const gainedByGlass = START_VOLUME * landed * POURED_SHARE * TRANSFER

  const bottleLevel = heightAtVolume(BOTTLE_VOLUME, leftInBottle)
  const glassLevel = heightAtVolume(GLASS_VOLUME, gainedByGlass)

  return {
    glassIn,
    capOff,
    tilt,
    flow,
    flowOn,
    flowOff,
    /** Back into the 0–1 domain the fill slider and the clipping plane use. */
    bottleFill: THREE.MathUtils.clamp(
      (bottleLevel - BOTTLE.fillMin) / (BOTTLE.fillMax - BOTTLE.fillMin),
      0,
      1,
    ),
    /** Height of the water surface in the glass, in glass-local space. */
    glassLevel,
  }
}

/**
 * Where the lip sits in the bottle's own space. Deliberately on the axis: the
 * page spins the bottle about Y throughout, and an off-axis pivot would walk
 * the lip in a circle away from the glass mid-pour.
 */
export const MOUTH_LOCAL = new THREE.Vector3(0, BOTTLE.neckTop, 0)

/**
 * Where the water actually leaves the bottle, which is *not* `MOUTH_LOCAL`.
 *
 * That point is the centre of the neck opening, on the spin axis — the right
 * place to pivot about, and the wrong place to start a stream. Water runs down
 * the inside of the tipped neck and departs from the lowest point of the rim,
 * so a stream born at the centre appears to start behind the neck and crosses
 * over it, which is what made it read as a band laid on top of the bottle
 * rather than liquid leaving it.
 *
 * The bottle is tilted by `-tilt` about Z, so the rim's local +X edge maps to
 * (cos tilt, -sin tilt): out towards the glass and downward. Derived from the
 * tilt rather than read off the mesh, so it stays correct under the spin.
 */
export function lipPoint(mouth, tilt, scale, out) {
  const r = BOTTLE.rNeck * scale
  return out.set(
    mouth.x + Math.cos(tilt) * r,
    mouth.y - Math.sin(tilt) * r,
    mouth.z,
  )
}

/**
 * Unit direction the water leaves the lip in: partly out over the rim, partly
 * already falling. Gravity does the rest — this only has to set the tangent at
 * the top of the arc.
 */
export function lipDirection(tilt, out) {
  return out.set(Math.cos(tilt) * 0.55, -(0.45 + Math.sin(tilt) * 0.55), 0).normalize()
}
