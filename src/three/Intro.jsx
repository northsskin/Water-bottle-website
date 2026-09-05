import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { introRuntime } from './runtime.js'
import { buildFlightPath } from './timeline.js'

const DURATION = 3.6
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * The opening shot.
 *
 * Owns the camera for its duration — the scroll rig is disabled while this runs,
 * rather than the two blending and fighting. Three things move together: the
 * camera pushes in from a low, wide angle; the studio lights come up from black
 * via tone-mapping exposure; and the cap descends and screws on while the bottle
 * fills, both driven from `introRuntime.t` by the parts themselves.
 *
 * `skip` cuts straight to the final frame, and reduced motion never starts it.
 */
export default function Intro({ isMobile, skipped, onDone }) {
  const { camera, gl } = useThree()
  const path = useMemo(() => buildFlightPath(isMobile), [isMobile])
  const scratch = useMemo(
    () => ({
      from: new THREE.Vector3(...(isMobile ? [2.2, 0.5, 12.5] : [3.4, 0.45, 10.5])),
      fromTarget: new THREE.Vector3(0, 1.0, 0),
      to: new THREE.Vector3(),
      toTarget: new THREE.Vector3(),
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
    }),
    [isMobile],
  )

  const elapsed = useRef(0)
  const finished = useRef(false)

  useEffect(() => {
    introRuntime.active = true
    introRuntime.t = 0
    return () => {
      introRuntime.active = false
      introRuntime.t = 1
      gl.toneMappingExposure = 1.05
    }
  }, [gl])

  useEffect(() => {
    if (!skipped || finished.current) return
    finished.current = true
    introRuntime.active = false
    introRuntime.t = 1
    gl.toneMappingExposure = 1.05
    onDone?.()
  }, [skipped, gl, onDone])

  useFrame((_, delta) => {
    if (finished.current) return

    elapsed.current += Math.min(delta, 0.05)
    const raw = Math.min(elapsed.current / DURATION, 1)
    introRuntime.t = raw

    // Camera: settles into exactly the hero keyframe, so handing over to the
    // scroll rig at the end is a continuation rather than a cut.
    path.sample(0, scratch.to, scratch.toTarget)
    const move = easeInOutCubic(raw)
    scratch.position.lerpVectors(scratch.from, scratch.to, move)
    scratch.target.lerpVectors(scratch.fromTarget, scratch.toTarget, move)
    camera.position.copy(scratch.position)
    camera.lookAt(scratch.target)

    // Lights up out of black over the first two-thirds.
    gl.toneMappingExposure = 1.05 * easeOutCubic(Math.min(raw / 0.66, 1))

    if (raw >= 1) {
      finished.current = true
      introRuntime.active = false
      introRuntime.t = 1
      onDone?.()
    }
  })

  return null
}
