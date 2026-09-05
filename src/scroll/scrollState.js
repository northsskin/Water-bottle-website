/**
 * The scroll clock.
 *
 * A plain mutable object rather than React state: the render loop reads these
 * values every frame, and routing them through React would re-render the whole
 * page sixty times a second. Components write into it, `useFrame` reads it —
 * the same discipline `useConfig.getState()` already follows in the scene.
 */
export const scrollState = {
  /** Whole-page progress, 0 at the top, 1 at the bottom. */
  progress: 0,
  /** Signed progress per second, smoothed. Drives the liquid's slosh. */
  velocity: 0,
  /** Local 0→1 progress for each registered section, keyed by id. */
  sections: Object.create(null),
  /** Playhead: a float index into the story sections. See sections.js. */
  u: 0,
  /** Section ids in document order, filled in by the registry. */
  order: [],
}

/** Local progress of one section, or 0 if it has not mounted yet. */
export const sectionProgress = (id) => scrollState.sections[id] ?? 0
