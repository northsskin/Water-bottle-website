import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sectionProgress } from '../../scroll/scrollState.js'
import { bottleRuntime } from '../runtime.js'
import { GLASS, glassInnerRadius, pourPhases } from '../pour.js'

const COUNT = 34
const GRAVITY = -3.2
const UP = new THREE.Vector3(0, 1, 0)

/**
 * Droplets thrown up where the stream hits the water.
 *
 * One InstancedMesh and a flat array of ballistic particles: no physics engine,
 * no per-droplet objects, one draw call. Droplets respawn at the impact point
 * whenever they die or fall back below the surface, so the splash sustains for
 * as long as water is landing rather than firing once.
 */
export default function Splash() {
  const meshRef = useRef()

  // Detail 1 rather than 0: a 20-face icosahedron at this size is visibly a
  // faceted lump, and lumps at the waterline read as beads floating in the
  // drink rather than as spray.
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(0.017, 1), [])
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#9fddf4'),
        // Was 0.5, which lit the droplets brighter than the water they came
        // out of and made each one a separate object.
        emissive: new THREE.Color('#69c6ea'),
        emissiveIntensity: 0.18,
        roughness: 0.05,
        metalness: 0,
        clearcoat: 1,
      }),
    [],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const particles = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        life: -1,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 1,
      })),
    [],
  )
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const heading = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const dt = Math.min(delta, 0.05)

    const p = sectionProgress('pour')
    const engaged = p > 0.0005 && p < 0.9995
    const flow = engaged ? pourPhases(p).flow : 0

    if (flow < 0.02) {
      mesh.visible = false
      return
    }
    mesh.visible = true

    const surfaceY = GLASS.floor + bottleRuntime.glassLevel
    const reach = Math.max(glassInnerRadius(surfaceY) - 0.03, 0.02)

    for (let i = 0; i < COUNT; i++) {
      const d = particles[i]
      d.life -= dt

      if (d.life <= 0 || d.y < surfaceY - 0.02) {
        // Respawn at the impact point with a shallow outward kick.
        const angle = Math.random() * Math.PI * 2
        const speed = 0.16 + Math.random() * 0.34
        d.x = GLASS.x + Math.cos(angle) * 0.012
        d.y = surfaceY + 0.006
        d.z = Math.sin(angle) * 0.012
        d.vx = Math.cos(angle) * speed * 0.55
        d.vz = Math.sin(angle) * speed * 0.55
        d.vy = 0.5 + Math.random() * 0.55
        d.life = 0.3 + Math.random() * 0.4
        d.scale = 0.5 + Math.random() * 0.8
      } else {
        d.vy += GRAVITY * dt
        d.x += d.vx * dt
        d.y += d.vy * dt
        d.z += d.vz * dt
      }

      // Keep the spray inside the glass rather than through its wall.
      const dx = d.x - GLASS.x
      const radial = Math.hypot(dx, d.z)
      if (radial > reach) {
        const k = reach / radial
        d.x = GLASS.x + dx * k
        d.z *= k
        d.vx *= -0.25
        d.vz *= -0.25
      }

      dummy.position.set(d.x, d.y, d.z)
      const fade = Math.min(d.life * 3, 1) * flow
      const size = d.scale * fade

      // Stretch each droplet along the direction it is travelling. A sphere
      // moving fast reads as a bead; the same volume drawn out into a streak
      // reads as spray, and it costs one lookAt rather than a second mesh.
      const speed = Math.hypot(d.vx, d.vy, d.vz)
      if (speed > 1e-4) {
        heading.set(d.vx / speed, d.vy / speed, d.vz / speed)
        dummy.quaternion.setFromUnitVectors(UP, heading)
      }
      const stretch = 1 + Math.min(speed * 1.1, 1.6)
      dummy.scale.set(size / Math.sqrt(stretch), size * stretch, size / Math.sqrt(stretch))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={meshRef} args={[geometry, material, COUNT]} frustumCulled={false} />
}
