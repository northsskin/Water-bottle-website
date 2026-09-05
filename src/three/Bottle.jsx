import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useConfig } from '../store.js'
import { CAPACITIES } from '../product.js'
import { scrollState, sectionProgress } from '../scroll/scrollState.js'
import { buildFlightPath } from './timeline.js'
import { bottleRuntime } from './runtime.js'
import { MAX_TILT, MOUTH_LOCAL, MOUTH_TARGET, pourPhases } from './pour.js'
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
  const pourAnchor = useRef()
  const tiltGroup = useRef()
  const pivotOffset = useRef()
  const scaleGroup = useRef()
  const path = useMemo(() => buildFlightPath(isMobile), [isMobile])
  const scratch = useMemo(
    () => ({
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
      mouth: new THREE.Vector3(),
    }),
    [],
  )
  const scale = useRef(1)
  const tilt = useRef(0)

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
      // Published so parts nested under the spin can move in view space rather
      // than in the bottle's own rotating frame.
      bottleRuntime.spin = spinGroup.current.rotation.y
    }

    // --- pouring -----------------------------------------------------------
    const p = sectionProgress('pour')
    const engaged = p > 0.0005 && p < 0.9995
    const phases = pourPhases(engaged ? p : 0)
    tilt.current = THREE.MathUtils.lerp(tilt.current, phases.tilt * MAX_TILT, damp(dt, 5))
    bottleRuntime.tilt = tilt.current

    // Pour staging. The bottle turns about its own lip, and the lip is carried
    // to a point just inside the glass rim — rotating about the base instead
    // swings a 22cm bottle right off the glass and reads as toppling.
    //
    // The pivot is cancelled at rest: the inner group is offset by -pivot, so
    // the anchor has to sit at +pivot when upright for the two to net to zero.
    const tiltNorm = tilt.current / MAX_TILT
    const pivotY = MOUTH_LOCAL.y * scale.current
    if (pivotOffset.current) pivotOffset.current.position.set(0, -pivotY, 0)
    if (pourAnchor.current) {
      pourAnchor.current.position.set(
        MOUTH_TARGET.x * tiltNorm,
        THREE.MathUtils.lerp(pivotY, MOUTH_TARGET.y, tiltNorm),
        0,
      )
    }
    // Spin lives inside the tilt, so the bottle keeps turning on its own axis
    // while tipped and the lip — being on that axis — never leaves the glass.
    if (tiltGroup.current) tiltGroup.current.rotation.z = -tilt.current

    // Publish the lip in world space for the stream to hang off, and the glass
    // level so the stream knows where the water surface is.
    if (scaleGroup.current) {
      // Refresh the chain first: everything above was set this frame, and
      // localToWorld would otherwise read matrices from the previous one.
      scaleGroup.current.updateWorldMatrix(true, false)
      scratch.mouth.copy(MOUTH_LOCAL)
      scaleGroup.current.localToWorld(scratch.mouth)
      bottleRuntime.mouth.copy(scratch.mouth)
    }
  })

  return (
    <group>
      <group ref={pourAnchor}>
        <group ref={tiltGroup}>
          <group ref={pivotOffset}>
            <group ref={spinGroup}>
              <group ref={scaleGroup}>
                <Shell transmissionEnabled={quality.transmission} />
                <Liquid reducedMotion={reducedMotion} />
                {/* Callouts need room for a leader line and a word — a phone
                    has neither, and the parts are legible without them. */}
                <CapAssembly showLabels={quality.labels && !isMobile} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
