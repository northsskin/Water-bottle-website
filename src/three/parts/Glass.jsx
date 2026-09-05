import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sectionProgress } from '../../scroll/scrollState.js'
import { bottleRuntime } from '../runtime.js'
import { GLASS, glassInnerRadius, pourPhases } from '../pour.js'
import { profilePoints } from '../bottleProfile.js'

const damp = (delta, speed) => 1 - Math.exp(-speed * delta)
const RIPPLES = 3

/** Outer wall profile of the tumbler. */
function outerRadius(y) {
  const t = THREE.MathUtils.clamp(y / GLASS.height, 0, 1)
  return THREE.MathUtils.lerp(GLASS.rBottom, GLASS.rTop, t)
}

/**
 * The glass, its contents, and the rings that spread from where the stream
 * lands. The contents are opaque for the same reason the bottle's are: three
 * builds a transmissive material's backdrop from the opaque render list, so a
 * transparent liquid would be invisible through the glass wall.
 */
export default function Glass({ quality }) {
  const group = useRef()
  const liquidRef = useRef()
  const surfaceRef = useRef()
  const rippleRefs = useRef([])

  const glassGeometry = useMemo(() => {
    // Lathed as a real vessel: up the outside, over the rim, back down the
    // inside and across the floor, so the wall has thickness and the rim reads
    // as an edge rather than a paper-thin cut.
    const points = []
    const steps = 24
    for (let i = 0; i <= steps; i++) {
      const y = (GLASS.height * i) / steps
      points.push(new THREE.Vector2(outerRadius(y), y))
    }
    for (let i = steps; i >= 0; i--) {
      const y = GLASS.floor + ((GLASS.height - GLASS.floor) * i) / steps
      points.push(new THREE.Vector2(glassInnerRadius(y), y))
    }
    points.push(new THREE.Vector2(0, GLASS.floor))
    const geo = new THREE.LatheGeometry(points, 64)
    geo.computeVertexNormals()
    return geo
  }, [])

  const liquidGeometry = useMemo(() => {
    const geo = new THREE.LatheGeometry(
      profilePoints(GLASS.floor, GLASS.height, glassInnerRadius, 48),
      48,
    )
    geo.computeVertexNormals()
    return geo
  }, [])

  const surfaceGeometry = useMemo(() => {
    const geo = new THREE.CircleGeometry(1, 48)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  const ringGeometry = useMemo(() => {
    const geo = new THREE.RingGeometry(0.55, 1, 40)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  const liquidMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#5cb8e0'),
        roughness: 0.08,
        metalness: 0,
        ior: 1.333,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        side: THREE.DoubleSide,
      }),
    [],
  )

  const clipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, -1, 0), GLASS.floor),
    [],
  )
  useEffect(() => {
    liquidMaterial.clippingPlanes = [clipPlane]
    return () => {
      liquidMaterial.clippingPlanes = null
    }
  }, [liquidMaterial, clipPlane])

  useEffect(
    () => () => {
      glassGeometry.dispose()
      liquidGeometry.dispose()
      surfaceGeometry.dispose()
      ringGeometry.dispose()
      liquidMaterial.dispose()
    },
    [glassGeometry, liquidGeometry, surfaceGeometry, ringGeometry, liquidMaterial],
  )

  const state = useRef({ level: GLASS.floor, ripple: [0.2, 0.55, 0.9] })

  useFrame((frame, delta) => {
    const dt = Math.min(delta, 0.05)
    const p = sectionProgress('pour')
    const engaged = p > 0.0005 && p < 0.9995
    const phases = pourPhases(engaged ? p : 0)
    const s = state.current

    // The whole prop retires off-stage when the section is not on screen.
    const presence = engaged ? phases.glassIn : 0
    if (group.current) {
      group.current.visible = presence > 0.01
      group.current.position.set(GLASS.x, (1 - presence) * -0.55, 0)
      group.current.scale.setScalar(0.85 + presence * 0.15)
    }
    if (!group.current?.visible) return

    // The level arrives already solved through the vessel's volume, so the
    // glass gains exactly what the bottle loses. All that is left here is to
    // damp the handover in and out of the section.
    s.level = THREE.MathUtils.lerp(s.level, phases.glassLevel, damp(dt, 6))
    const level = s.level
    clipPlane.constant = level
    // Single source of truth for where the water surface is: the stream and the
    // splash both land on it, and a second estimate elsewhere would drift.
    bottleRuntime.glassLevel = level - GLASS.floor

    const hasWater = level > GLASS.floor + 0.002
    if (liquidRef.current) liquidRef.current.visible = hasWater
    if (surfaceRef.current) {
      surfaceRef.current.visible = hasWater
      surfaceRef.current.position.y = level
      const r = glassInnerRadius(level) - 0.004
      surfaceRef.current.scale.set(r, r, r)
    }

    // Rings spreading from the point of impact, staggered so there is always
    // one starting as another dies.
    for (let i = 0; i < RIPPLES; i++) {
      const mesh = rippleRefs.current[i]
      if (!mesh) continue
      s.ripple[i] += dt * 1.5
      if (s.ripple[i] > 1) s.ripple[i] -= 1
      const t = s.ripple[i]
      const alive = phases.flow > 0.02 && hasWater
      mesh.visible = alive
      if (!alive) continue
      const r = THREE.MathUtils.lerp(0.03, glassInnerRadius(level) - 0.01, t)
      mesh.position.y = level + 0.004
      mesh.scale.set(r, r, r)
      mesh.material.opacity = (1 - t) * 0.5 * phases.flow
    }
  })

  return (
    <group ref={group} position={[GLASS.x, 0, 0]}>
      <mesh geometry={glassGeometry} castShadow>
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={quality.transmission ? 0.98 : 0}
          thickness={0.12}
          roughness={0.03}
          metalness={0}
          ior={1.5}
          clearcoat={1}
          clearcoatRoughness={0.02}
          transparent={!quality.transmission}
          opacity={quality.transmission ? 1 : 0.35}
          side={THREE.DoubleSide}
          envMapIntensity={1.2}
        />
      </mesh>

      <mesh ref={liquidRef} geometry={liquidGeometry} material={liquidMaterial} />

      <mesh ref={surfaceRef} geometry={surfaceGeometry}>
        <meshPhysicalMaterial
          color="#cdeeff"
          emissive="#8fd8f7"
          emissiveIntensity={0.4}
          roughness={0.04}
          clearcoat={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {Array.from({ length: RIPPLES }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            rippleRefs.current[i] = el
          }}
          geometry={ringGeometry}
        >
          <meshBasicMaterial color="#e8f8ff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
