/**
 * Camera choreography.
 *
 * `position` / `target` frame a bottle that always sits at the world origin.
 * `offset` then slides the *camera* sideways (see CameraRig) so the bottle lands
 * off-centre without changing how tightly it is framed — the value is a fraction
 * of the viewport width, so 0.22 parks the bottle in the middle of the right
 * column at any aspect ratio.
 *
 * `mobile` replaces the framing on narrow screens, where the tight close-ups do
 * not fit; there the moves are deliberately gentler and never offset.
 *
 * `spin` is the bottle's own Y rotation: `null` keeps it idling, a number eases
 * it round so the detail in question faces the camera.
 */
export const CAMERA_POSES = {
  hero: {
    position: [0, 2.5, 7.7],
    target: [0, 1.62, 0],
    offset: 0,
    spin: null,
    mobile: { position: [0, 2.4, 11.2], target: [0, 1.45, 0] },
  },
  body: {
    position: [1.5, 2.05, 3.8],
    target: [0, 1.15, 0],
    offset: 0.22,
    spin: null,
    mobile: { position: [0.4, 1.9, 6.9], target: [0, 1.35, 0] },
  },
  cap: {
    position: [1.25, 2.85, 2.55],
    target: [0, 1.95, 0],
    offset: 0.22,
    spin: 0.35,
    mobile: { position: [0.5, 2.6, 6.4], target: [0, 1.8, 0] },
  },
  label: {
    position: [0.4, 1.3, 2.85],
    target: [0, 0.98, 0],
    offset: 0.22,
    spin: 0,
    mobile: { position: [0, 1.3, 6.2], target: [0, 1.0, 0] },
  },
  base: {
    position: [1.25, 1.05, 2.6],
    target: [0, 0.3, 0],
    offset: 0.22,
    spin: 0,
    mobile: { position: [0.4, 0.9, 6.2], target: [0, 0.6, 0] },
  },
  customize: {
    position: [-0.7, 1.5, 5.9],
    target: [0, 1.1, 0],
    offset: -0.22,
    spin: 0,
    mobile: { position: [0, 1.4, 6.6], target: [0, 1.05, 0] },
  },
  specs: {
    position: [-2.4, 2.3, 5.9],
    target: [0, 1.05, 0],
    offset: 0.22,
    spin: null,
    mobile: { position: [-1.2, 2.0, 7.2], target: [0, 1.05, 0] },
  },
  final: {
    position: [0.5, 1.9, 6.6],
    target: [0, 1.1, 0],
    offset: -0.24,
    spin: null,
    mobile: { position: [0, 1.5, 9.0], target: [0, 1.0, 0] },
  },
}

export function resolvePose(key, isMobile) {
  const pose = CAMERA_POSES[key] ?? CAMERA_POSES.hero
  if (isMobile && pose.mobile) {
    return { ...pose, ...pose.mobile, offset: 0 }
  }
  return pose
}
