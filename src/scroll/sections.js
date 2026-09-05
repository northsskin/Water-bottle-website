import { useEffect, useRef } from 'react'
import { useScroll, useMotionValueEvent } from 'framer-motion'
import { scrollState } from './scrollState.js'

/**
 * The ordered spine of the story.
 *
 * Sections register their DOM node here; we measure where each one's centre sits
 * in the document and turn the scroll position into `scrollState.u` — a float
 * index into that list. u = 2 means "section 2 is dead centre", u = 2.5 means
 * "halfway between sections 2 and 3". The camera timeline is keyed to the same
 * indices, so u is literally the playhead.
 *
 * Measuring real offsets (rather than assuming equal-height sections) is what
 * lets the pinned set pieces be twice as tall as everything else without the
 * camera drifting out of sync with the copy.
 */
const registry = new Map()
let centers = []

function measure() {
  // Document-absolute, via the rect: offsetTop is relative to the nearest
  // positioned ancestor, and the sections do not all share one — the feature
  // set pieces sit inside a `relative` wrapper, so offsetTop would put them
  // hundreds of pixels up the page and slide the whole flight out of step.
  const scrollY = window.scrollY
  centers = [...registry.entries()]
    .map(([id, el]) => {
      const rect = el.getBoundingClientRect()
      return { id, center: rect.top + scrollY + rect.height / 2 }
    })
    .sort((a, b) => a.center - b.center)
  scrollState.order = centers.map((c) => c.id)
}

/** Recomputes the playhead. Called on every scroll tick. */
export function updateTimelineU() {
  if (centers.length === 0) return
  const y = window.scrollY + window.innerHeight / 2

  if (y <= centers[0].center) {
    scrollState.u = 0
    return
  }
  const last = centers.length - 1
  if (y >= centers[last].center) {
    scrollState.u = last
    return
  }
  for (let i = 0; i < last; i++) {
    const a = centers[i].center
    const b = centers[i + 1].center
    if (y >= a && y <= b) {
      scrollState.u = i + (y - a) / (b - a || 1)
      return
    }
  }
}

/**
 * Registers a story section. Returns the ref to attach to its outer element.
 * Also publishes the section's own 0→1 travel through the viewport, which is
 * what the pinned set pieces scrub against.
 */
export function useStorySection(id, offset = ['start end', 'end start']) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset })

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    scrollState.sections[id] = v
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    registry.set(id, el)
    scrollState.sections[id] = scrollYProgress.get()

    // Fonts and images settle after mount and move everything; re-measure until
    // the layout stops changing rather than trusting a single reading.
    measure()
    const observer = new ResizeObserver(() => {
      measure()
      updateTimelineU()
    })
    observer.observe(el)
    observer.observe(document.body)

    return () => {
      observer.disconnect()
      registry.delete(id)
      delete scrollState.sections[id]
      measure()
    }
  }, [id, scrollYProgress])

  return ref
}
