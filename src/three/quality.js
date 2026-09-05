import { useCallback, useMemo, useState } from 'react'

/**
 * Three quality tiers, guessed up front and corrected by measurement.
 *
 * The brief was "as much as possible without slowing the site down", which only
 * means anything if something is actually watching the frame rate. The initial
 * guess keeps a weak machine from ever paying for a heavy first frame; drei's
 * PerformanceMonitor then demotes at runtime if the guess was optimistic.
 */
export const TIERS = {
  high: {
    name: 'high',
    dpr: 2,
    bloom: true,
    depthOfField: true,
    caustics: true,
    transmission: true,
    transmissionScale: 1,
    labels: true,
    shadowResolution: 512,
    shadowFrames: Infinity,
  },
  medium: {
    name: 'medium',
    dpr: 1.5,
    bloom: true,
    depthOfField: false,
    caustics: false,
    transmission: true,
    transmissionScale: 0.7,
    labels: true,
    shadowResolution: 256,
    shadowFrames: Infinity,
  },
  low: {
    name: 'low',
    dpr: 1,
    bloom: false,
    depthOfField: false,
    caustics: false,
    // Transmission forces an extra full-scene render every frame, and it is
    // easily the most expensive thing here — but switching it off costs the
    // liquid, which is the whole product. Render that pass at a quarter of the
    // pixels instead: through a refracting wall nobody can tell, and it is the
    // difference between an empty bottle and a full one.
    transmission: true,
    transmissionScale: 0.5,
    labels: false,
    shadowResolution: 256,
    shadowFrames: 1,
  },
}

const ORDER = ['low', 'medium', 'high']

function guessTier(isMobile) {
  if (typeof navigator === 'undefined') return 'medium'

  // `?tier=high` pins a tier, for comparing them on real hardware alongside
  // `?stats`. Also stops the auto-demotion below from overriding the choice.
  const forced = new URLSearchParams(window.location.search).get('tier')
  if (forced && TIERS[forced]) return forced

  if (isMobile) return 'low'

  const cores = navigator.hardwareConcurrency ?? 4
  const memory = navigator.deviceMemory ?? 4
  // A retina panel means four times the pixels for the same scene, so a machine
  // needs headroom to spare before it earns the top tier on one.
  const dense = (window.devicePixelRatio ?? 1) > 1.5

  if (cores >= 8 && memory >= 8) return dense ? 'medium' : 'high'
  if (cores >= 4) return 'medium'
  return 'low'
}

export function useQuality(isMobile) {
  const [name, setName] = useState(() => guessTier(isMobile))

  const pinned =
    typeof window !== 'undefined' &&
    TIERS[new URLSearchParams(window.location.search).get('tier') ?? '']

  const decline = useCallback(() => {
    if (pinned) return
    setName((current) => {
      const i = ORDER.indexOf(current)
      return i > 0 ? ORDER[i - 1] : current
    })
  }, [pinned])

  // Deliberately one-way. Promoting on a good stretch would let the page
  // oscillate between tiers, and a visual setting flickering as you scroll is
  // worse than simply running one notch below what the machine could manage.
  return useMemo(() => ({ quality: TIERS[name] ?? TIERS.medium, decline }), [name, decline])
}
