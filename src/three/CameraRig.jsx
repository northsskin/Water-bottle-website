import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../scroll/scrollState.js'
import { buildFlightPath } from './timeline.js'
import { useConfig } from '../store.js'
import { CAPACITIES } from '../product.js'

const damp = (delta, speed) => 1 - Math.exp(-speed * delta)

/**
 * Flies the camera along the timeline spline, with drag layered on top.
 *
 * The old rig handed the camera to OrbitControls on pointer-down and froze the
 * scroll choreography for nearly two seconds afterwards, which reads as broken
 * the moment scroll position is driving the shot. Here a drag only accumulates
 * an angular *offset* that is added to whatever the scroll is currently
 * pointing at, then decays back to zero — so the two compose instead of fighting,
 * and letting go glides back into the film rather than snapping.
 */
export default function CameraRig({ isMobile, enabled = true }) {
  const { camera, gl } = useThree()
  const path = useMemo(() => buildFlightPath(isMobile), [isMobile])

  const scratch = useMemo(
    () => ({
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
      spherical: new THREE.Spherical(),
      offsetVec: new THREE.Vector3(),
      smoothPosition: new THREE.Vector3(),
      smoothTarget: new THREE.Vector3(),
    }),
    [],
  )

  const drag = useRef({ azimuth: 0, polar: 0, active: false })
  const capacityScale = useRef(1)
  const seeded = useRef(false)

  // Pointer drag. `touch-action: pan-y` on the canvas means the browser keeps
  // vertical scrolling for itself and only hands us sideways gestures, so the
  // bottle is inspectable on a phone without swallowing the page scroll.
  useEffect(() => {
    if (!enabled) return
    const el = gl.domElement
    let pointerId = null
    let lastX = 0
    let lastY = 0

    const down = (e) => {
      if (pointerId !== null) return
      pointerId = e.pointerId
      lastX = e.clientX
      lastY = e.clientY
      drag.current.active = true
      el.setPointerCapture?.(e.pointerId)
    }

    const move = (e) => {
      if (e.pointerId !== pointerId) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      drag.current.azimuth -= dx * 0.005
      drag.current.polar = THREE.MathUtils.clamp(drag.current.polar - dy * 0.003, -0.45, 0.45)
      // Keep the sideways swing bounded so a hard flick cannot spin the shot
      // round to the back of the bottle and leave the copy facing nothing.
      drag.current.azimuth = THREE.MathUtils.clamp(drag.current.azimuth, -0.9, 0.9)
    }

    const up = (e) => {
      if (e.pointerId !== pointerId) return
      pointerId = null
      drag.current.active = false
      el.releasePointerCapture?.(e.pointerId)
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
  }, [gl, enabled])

  useFrame((_, delta) => {
    if (!enabled) return
    const dt = Math.min(delta, 0.1)
    const s = scratch

    const { fov, offset } = path.sample(scrollState.u, s.position, s.target)

    // A 1 L bottle is 12% taller, so every authored height rides along with it.
    const capacity = useConfig.getState().capacity
    const scaleTarget = CAPACITIES.find((c) => c.id === capacity)?.scale ?? 1
    capacityScale.current = THREE.MathUtils.lerp(capacityScale.current, scaleTarget, damp(dt, 6))
    s.position.y *= capacityScale.current
    s.target.y *= capacityScale.current

    // Slide the rig sideways rather than the bottle, so the framing stays
    // exactly as authored while the subject lands off-centre.
    if (offset) {
      s.forward.copy(s.target).sub(s.position)
      const distance = s.forward.length()
      s.forward.divideScalar(distance || 1)
      s.right.crossVectors(s.forward, camera.up).normalize()
      const halfHeight = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * distance
      const shift = offset * 2 * halfHeight * camera.aspect
      s.position.addScaledVector(s.right, -shift)
      s.target.addScaledVector(s.right, -shift)
    }

    // Drag offset, applied in spherical space around the current look-at point
    // and bled off whenever the pointer is up.
    if (!drag.current.active) {
      const decay = 1 - damp(dt, 1.6)
      drag.current.azimuth *= decay
      drag.current.polar *= decay
    }
    if (drag.current.azimuth || drag.current.polar) {
      s.offsetVec.copy(s.position).sub(s.target)
      s.spherical.setFromVector3(s.offsetVec)
      s.spherical.theta += drag.current.azimuth
      s.spherical.phi = THREE.MathUtils.clamp(
        s.spherical.phi + drag.current.polar,
        0.45,
        Math.PI - 0.55,
      )
      s.offsetVec.setFromSpherical(s.spherical)
      s.position.copy(s.target).add(s.offsetVec)
    }

    // A light damp on top of Lenis: enough to give the camera mass, not enough
    // to break the sense that the wheel is driving it directly.
    if (!seeded.current) {
      s.smoothPosition.copy(s.position)
      s.smoothTarget.copy(s.target)
      seeded.current = true
    }
    const k = damp(dt, 9)
    s.smoothPosition.lerp(s.position, k)
    s.smoothTarget.lerp(s.target, k)

    camera.position.copy(s.smoothPosition)
    camera.lookAt(s.smoothTarget)

    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, fov, k)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
