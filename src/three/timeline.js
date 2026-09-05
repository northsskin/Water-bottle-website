import * as THREE from 'three'

/**
 * The camera flight, one keyframe per story section, in document order.
 *
 * These are sampled off a Catmull-Rom spline rather than eased toward one at a
 * time, so the camera is always in motion with the wheel and never "arrives".
 *
 * - `position` / `target` frame a bottle standing at the world origin.
 * - `fov` narrows for the close beats; a focal-length change reads as a very
 *   different move from simply flying nearer.
 * - `offset` slides the whole rig sideways, as a fraction of viewport width, so
 *   the bottle lands in the empty column at any aspect ratio without changing
 *   how tightly it is framed.
 * - `spin` is the bottle's absolute Y rotation. It climbs monotonically across
 *   the page, so scrolling turns the product in your hands — roughly one full
 *   revolution from top to bottom.
 * - `mobile` replaces the framing on narrow screens, where the close-ups do not
 *   fit; offsets are dropped there because there is no second column.
 */
export const KEYFRAMES = [
  {
    id: 'hero',
    position: [0, 2.5, 7.7],
    target: [0, 1.62, 0],
    fov: 35,
    offset: 0,
    spin: 0,
    mobile: { position: [0, 2.4, 11.2], target: [0, 1.45, 0] },
  },
  {
    id: 'insulation',
    position: [1.5, 2.05, 3.8],
    target: [0, 1.15, 0],
    fov: 35,
    offset: 0.22,
    spin: 0.9,
    mobile: { position: [0.4, 1.9, 6.9], target: [0, 1.35, 0] },
  },
  {
    id: 'cap',
    // Pulled back and aimed higher than a plain cap close-up would be: the
    // exploded parts travel up to half a unit above the neck and the shot has
    // to hold all of them.
    position: [1.55, 3.05, 3.95],
    target: [0, 2.18, 0],
    fov: 34,
    offset: 0.22,
    spin: 1.85,
    mobile: { position: [0.45, 2.5, 6.9], target: [0, 1.5, 0] },
  },
  {
    id: 'pour',
    // Framed on the pair, not the bottle: the tipped bottle rises and moves
    // right while the glass sits at x = 0.98, so the shot is centred between
    // them and pulled back enough to hold the stream in the air.
    position: [1.3, 1.75, 6.6],
    target: [0.28, 0.82, 0],
    fov: 36,
    offset: 0.17,
    spin: 2.75,
    // A phone cannot hold the whole tableau — fitting 2.8 units of width would
    // shrink it to nothing — so it frames the pour itself, lip to glass, and
    // lets the bottle body run out of frame.
    mobile: { position: [0.95, 1.1, 4.9], target: [0.85, 0.45, 0] },
  },
  {
    id: 'eco',
    position: [1.25, 1.05, 2.75],
    target: [0, 0.35, 0],
    fov: 35,
    offset: 0.22,
    spin: 3.7,
    mobile: { position: [0.4, 1.0, 6.2], target: [0, 0.6, 0] },
  },
  {
    id: 'customize',
    position: [-0.7, 1.5, 5.9],
    target: [0, 1.1, 0],
    fov: 35,
    offset: -0.22,
    spin: 4.55,
    mobile: { position: [0, 1.4, 6.8], target: [0, 1.05, 0] },
  },
  {
    id: 'specs',
    position: [-2.4, 2.3, 5.9],
    target: [0, 1.05, 0],
    fov: 35,
    offset: 0.22,
    spin: 5.6,
    mobile: { position: [-1.2, 2.0, 7.2], target: [0, 1.05, 0] },
  },
  {
    id: 'final',
    position: [0.5, 1.9, 6.6],
    target: [0, 1.1, 0],
    fov: 35,
    offset: -0.24,
    spin: 6.5,
    mobile: { position: [0, 1.55, 9.0], target: [0, 1.0, 0] },
  },
]

export const SECTION_IDS = KEYFRAMES.map((k) => k.id)

const frame = (k, isMobile) =>
  isMobile && k.mobile ? { ...k, ...k.mobile, offset: 0 } : k

/**
 * Builds the sampler for a given breakpoint. Catmull-Rom passes exactly through
 * each control point at t = i / (n - 1), so a playhead of 2.0 lands precisely on
 * the pose authored for section 2 — the spline only shapes the travel between.
 */
export function buildFlightPath(isMobile) {
  const frames = KEYFRAMES.map((k) => frame(k, isMobile))
  const last = frames.length - 1

  const positions = new THREE.CatmullRomCurve3(
    frames.map((k) => new THREE.Vector3(...k.position)),
    false,
    'centripetal',
    0.5,
  )
  const targets = new THREE.CatmullRomCurve3(
    frames.map((k) => new THREE.Vector3(...k.target)),
    false,
    'centripetal',
    0.5,
  )

  /** Straight-line interpolation for the scalar tracks, which want no overshoot. */
  const scalar = (key, u) => {
    const i = Math.min(Math.floor(u), last)
    const j = Math.min(i + 1, last)
    return THREE.MathUtils.lerp(frames[i][key], frames[j][key], u - i)
  }

  return {
    length: frames.length,
    sample(u, outPosition, outTarget) {
      const t = last === 0 ? 0 : THREE.MathUtils.clamp(u, 0, last) / last
      positions.getPoint(t, outPosition)
      targets.getPoint(t, outTarget)
      return { fov: scalar('fov', u), offset: scalar('offset', u), spin: scalar('spin', u) }
    },
  }
}
