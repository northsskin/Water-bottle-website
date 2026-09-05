import { useEffect, useState } from 'react'
import { scrollState } from '../../scroll/scrollState.js'
import { SECTION_IDS } from '../../three/timeline.js'

const LABELS = {
  hero: 'Vessel One',
  insulation: 'Insulation',
  cap: 'Cap',
  pour: 'Capacity',
  eco: 'Materials',
  customize: 'Customise',
  specs: 'Specs',
  final: 'Buy',
}

/**
 * A fixed rail marking where you are in the story.
 *
 * Reads the same playhead the camera flies on, so the highlight and the shot
 * change together. It polls on rAF rather than subscribing, and only commits to
 * React state when the rounded index actually changes — at most eight renders
 * for a full pass down the page.
 */
export default function ProgressRail() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    let frame = 0
    let last = -1
    const tick = () => {
      const next = Math.round(scrollState.u)
      if (next !== last) {
        last = next
        setActive(next)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <nav
      aria-label="Section progress"
      className="pointer-events-none fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex"
    >
      {SECTION_IDS.map((id, i) => (
        <a
          key={id}
          href={`#${id}`}
          className="pointer-events-auto group flex items-center justify-end gap-2"
          aria-current={i === active ? 'true' : undefined}
        >
          <span className="text-[10px] uppercase tracking-[0.16em] text-ink-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {LABELS[id] ?? id}
          </span>
          <span
            className={`h-px transition-all duration-500 ${
              i === active ? 'w-7 bg-ink-900' : 'w-3.5 bg-ink-900/25'
            }`}
          />
        </a>
      ))}
    </nav>
  )
}
