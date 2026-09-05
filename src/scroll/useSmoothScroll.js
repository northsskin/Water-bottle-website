import { useEffect } from 'react'
import Lenis from 'lenis'
import { scrollState } from './scrollState.js'
import { updateTimelineU } from './sections.js'

/**
 * Smooth scrolling, plus the page-level progress and velocity readings.
 *
 * Native wheel scroll arrives in coarse steps, which makes anything welded to
 * scroll position judder no matter how fast it renders. Lenis interpolates
 * between those steps on its own rAF loop, so the camera flight reads as one
 * continuous move.
 *
 * Under `prefers-reduced-motion` Lenis is never constructed — the page keeps
 * native scrolling and a plain listener supplies progress.
 */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    const track = (scrollY, limit, velocity) => {
      scrollState.progress = limit > 0 ? scrollY / limit : 0
      scrollState.velocity = velocity
      updateTimelineU()
    }

    if (!enabled) {
      const onScroll = () => {
        const limit = document.documentElement.scrollHeight - window.innerHeight
        track(window.scrollY, limit, 0)
      }
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    }

    const lenis = new Lenis({
      duration: 1.05,
      // Long, gentle tail: the last 20% of the ease is what makes a scroll-linked
      // camera feel like it is settling rather than stopping.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.6,
    })

    lenis.on('scroll', ({ scroll, limit, velocity }) => track(scroll, limit, velocity))

    let frame = 0
    const raf = (time) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
      scrollState.velocity = 0
    }
  }, [enabled])
}
