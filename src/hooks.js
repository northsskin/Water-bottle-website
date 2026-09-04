import { useEffect, useRef, useState } from 'react'
import { useConfig } from './store.js'

/**
 * Returns a ref to attach to a block. Whenever that block crosses the middle
 * band of the viewport it becomes the camera's focus, which is what drives the
 * scroll-synced camera moves.
 */
export function useFocusTrigger(focus) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) useConfig.getState().setFocus(focus)
      },
      // Only the middle 20% of the viewport counts as "you are looking at this".
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [focus])

  return ref
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
export const usePrefersReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)')
