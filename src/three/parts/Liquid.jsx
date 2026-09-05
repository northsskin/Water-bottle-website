import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useConfig } from '../../store.js'
import { scrollState, sectionProgress } from '../../scroll/scrollState.js'
import { bottleRuntime, introRuntime } from '../runtime.js'
import { BOTTLE, fillHeight, innerRadius, profilePoints } from '../bottleProfile.js'

const damp = (delta, speed) => 1 - Math.exp(-speed * delta)
const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

const UP = new THREE.Vector3(0, 1, 0)
const DOWN = new THREE.Vector3(0, -1, 0)
const X_AXIS = new THREE.Vector3(1, 0, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

/**
 * The pour beat: drain, then refill past where it started.
 *
 * Emptying first is what makes the refill land — you cannot appreciate a rising
 * waterline if it was already near the top when the section began.
 */
function pourLevel(p) {
  const drain = smoothstep(0.08, 0.38, p)
  const refill = smoothstep(0.46, 0.86, p)
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.72, 0.04, drain), 1, refill)
}

export default function Liquid({ reducedMotion = false }) {
  const meshRef = useRef()
  const surfaceRef = useRef()

  const geometry = useMemo(() => {
    const geo = new THREE.LatheGeometry(
      profilePoints(BOTTLE.wall, BOTTLE.fillMax + 0.06, innerRadius, 96),
      56,
    )
    geo.computeVertexNormals()
    return geo
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  // circleGeometry faces +Z; bake the lie-flat rotation into the geometry so the
  // surface quaternion below can treat +Y as its resting normal.
  const surfaceGeometry = useMemo(() => {
    const geo = new THREE.CircleGeometry(1, 48)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])
  useEffect(() => () => surfaceGeometry.dispose(), [surfaceGeometry])

  /**
   * Opaque on purpose: three.js builds the backdrop for a transmissive material
   * from the opaque render list only, so a transparent liquid would be invisible
   * through the shell. Its watery quality comes from the shell refracting it,
   * plus a fresnel rim patched into the emissive term.
   */
  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#5cb8e0'),
      roughness: 0.08,
      metalness: 0,
      ior: 1.333,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide,
    })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: new THREE.Color('#bff0ff') }
      shader.uniforms.uRimStrength = { value: 0.85 }
      shader.fragmentShader =
        'uniform vec3 uRimColor;\nuniform float uRimStrength;\n' +
        shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           float fresnel = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
           totalEmissiveRadiance += uRimColor * fresnel * uRimStrength;`,
        )
    }
    m.customProgramCacheKey = () => 'aquem-liquid-fresnel'
    return m
  }, [])

  const surfaceMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        // Deliberately bright: seen through a tinted shell this is the one thing
        // that makes the waterline unmistakable.
        color: new THREE.Color('#cdeeff'),
        emissive: new THREE.Color('#8fd8f7'),
        emissiveIntensity: 0.45,
        roughness: 0.04,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        side: THREE.DoubleSide,
      }),
    [],
  )

  useEffect(
    () => () => {
      material.dispose()
      surfaceMaterial.dispose()
    },
    [material, surfaceMaterial],
  )

  // The fill level is a world-space clipping plane: everything above it is cut
  // away, so the level animates without rebuilding a single vertex.
  const clipPlane = useMemo(
    () => new THREE.Plane(DOWN.clone(), fillHeight(useConfig.getState().fill)),
    [],
  )
  useEffect(() => {
    material.clippingPlanes = [clipPlane]
    material.clipShadows = true
    return () => {
      material.clippingPlanes = null
    }
  }, [material, clipPlane])

  const state = useRef({
    fill: useConfig.getState().fill,
    // Slosh is a spring, not an ease: water overshoots and rocks back, and that
    // second swing is most of what sells it as liquid rather than a moving line.
    tilt: 0,
    tiltVelocity: 0,
  })
  const scratch = useMemo(
    () => ({ normal: new THREE.Vector3(), point: new THREE.Vector3(), quat: new THREE.Quaternion() }),
    [],
  )

  useFrame((frameState, delta) => {
    const dt = Math.min(delta, 0.05)
    const config = useConfig.getState()
    const s = state.current

    // Scroll owns the level while the pour section is on screen; the
    // configurator owns it everywhere else, and the damp hides the handover.
    const p = sectionProgress('pour')
    const engaged = p > 0.001 && p < 0.999
    let target
    if (introRuntime.active) {
      // Pours in over the back half of the opening, once there is a cap to pour
      // under and enough light to see it.
      target = config.fill * smoothstep(0.4, 0.95, introRuntime.t)
    } else {
      target = engaged ? pourLevel(p) : config.fill
    }
    s.fill = THREE.MathUtils.lerp(s.fill, target, damp(dt, engaged || introRuntime.active ? 9 : 4))

    const fillY = fillHeight(s.fill)
    const scale = bottleRuntime.scale

    if (reducedMotion) {
      s.tilt = 0
      s.tiltVelocity = 0
    } else {
      // Scaled so an ordinary reading scroll tilts a few degrees and only a
      // hard flick reaches the clamp. The previous factor saturated at a
      // velocity of ~100 when a normal wheel notch already peaks near 1200,
      // which made the slosh binary instead of proportional.
      const drive = THREE.MathUtils.clamp(scrollState.velocity * 0.00025, -0.16, 0.16)
      const stiffness = 90
      const damping = 7.5
      s.tiltVelocity += (drive - s.tilt) * stiffness * dt - s.tiltVelocity * damping * dt
      s.tilt += s.tiltVelocity * dt
    }

    const bob = reducedMotion ? 0 : Math.sin(frameState.clock.elapsedTime * 1.4) * 0.004
    const surfaceY = (fillY + bob) * scale

    scratch.normal.copy(DOWN).applyAxisAngle(X_AXIS, s.tilt).applyAxisAngle(Z_AXIS, s.tilt * 0.35)
    scratch.point.set(0, surfaceY, 0)
    clipPlane.setFromNormalAndCoplanarPoint(scratch.normal, scratch.point)

    const visible = s.fill > 0.015
    if (meshRef.current) meshRef.current.visible = visible

    if (surfaceRef.current) {
      const r = innerRadius(fillY) - 0.004
      surfaceRef.current.position.y = fillY + bob
      // The disc is the plane's cross-section, so it has to lie in the plane —
      // otherwise a tilted waterline shows a flat lid floating inside it.
      scratch.quat.setFromUnitVectors(UP, scratch.normal.clone().negate())
      surfaceRef.current.quaternion.copy(scratch.quat)
      surfaceRef.current.scale.set(r, r, r)
      surfaceRef.current.visible = visible
    }
  })

  return (
    <>
      <mesh ref={meshRef} geometry={geometry} material={material} />
      <mesh ref={surfaceRef} geometry={surfaceGeometry} material={surfaceMaterial} />
    </>
  )
}
