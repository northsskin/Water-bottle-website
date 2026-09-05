import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useConfig } from '../store.js'
import { CAPACITIES } from '../product.js'
import { scrollState } from '../scroll/scrollState.js'
import { buildFlightPath } from './timeline.js'
import { bottleRuntime } from './runtime.js'
import Shell from './parts/Shell.jsx'
import Liquid from './parts/Liquid.jsx'
import CapAssembly from './parts/CapAssembly.jsx'

const damp = (delta, speed) => 1 - Math.exp(-speed * delta)

/**
 * Composes the product and owns the two transforms every part shares: the
 * capacity scale and the scroll-driven spin.
 *
 * Rotation is authored per keyframe and interpolated along the playhead, so the
 * page turns the bottle roughly one full revolution from top to bottom —
 * scrolling handles the product rather than just flying past it.
 */
export default function Bottle({ isMobile = false, reducedMotion = false, quality }) {
  const spinGroup = useRef()
  const scaleGroup = useRef()
  const path = useMemo(() => buildFlightPath(isMobile), [isMobile])
  const scratch = useMemo(
    () => ({ position: new THREE.Vector3(), target: new THREE.Vector3() }),
    [],
  )
  const scale = useRef(1)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    const { spin } = path.sample(scrollState.u, scratch.position, scratch.target)

    const capacity = useConfig.getState().capacity
    const target = CAPACITIES.find((c) => c.id === capacity)?.scale ?? 1
    scale.current = THREE.MathUtils.lerp(scale.current, target, damp(dt, 6))
    bottleRuntime.scale = scale.current

    if (scaleGroup.current) {
      // Taller sizes gain a little girth too, but not proportionally — that is
      // how the real family of bottles is designed.
      const lateral = 1 + (scale.current - 1) * 0.35
      scaleGroup.current.scale.set(lateral, scale.current, lateral)
    }

    if (spinGroup.current) {
      const current = spinGroup.current.rotation.y
      spinGroup.current.rotation.y = reducedMotion
        ? spin
        : THREE.MathUtils.lerp(current, spin, damp(dt, 7))
    }
  })

  return (
    <group>
      <group ref={spinGroup}>
        <group ref={scaleGroup}>
          <Shell transmissionEnabled={quality.transmission} />
          <Liquid reducedMotion={reducedMotion} />
          {/* Callouts need room for a leader line and a word — a phone has
              neither, and the parts are legible without them. */}
          <CapAssembly showLabels={quality.labels && !isMobile} />
        </group>
      </group>
    </group>
  )
}
