import * as THREE from 'three'

/**
 * Per-frame scene values shared between parts of the bottle without going
 * through React. The capacity scale in particular is needed in two places at
 * once — the group transform and the world-space clipping plane — and it must
 * be the same number in both on the same frame.
 */
export const bottleRuntime = {
  /** Smoothed capacity scale: 1 for 750 ml, 1.12 for 1 L. */
  scale: 1,
  /** Current tilt of the bottle in radians, 0 upright. */
  tilt: 0,
  /** Current Y rotation of the bottle, in radians. */
  spin: 0,
  /** World position of the lip, after spin, tilt and capacity scale. */
  mouth: new THREE.Vector3(0, 2, 0),
  /** Height of the water inside the glass, above the glass floor. */
  glassLevel: 0,
}

/**
 * The opening sequence's clock. Read by the cap and the liquid so the assembly
 * reuses the same rigs the scroll set pieces drive, rather than duplicating them.
 */
export const introRuntime = {
  active: true,
  /** 0 at the first frame of the intro, 1 once the bottle is fully assembled. */
  t: 0,
}
