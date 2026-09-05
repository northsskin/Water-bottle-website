import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sectionProgress } from '../../scroll/scrollState.js'
import { bottleRuntime } from '../runtime.js'
import { GLASS, pourPhases } from '../pour.js'

const UP = new THREE.Vector3(0, 1, 0)

/**
 * The water in the air between the lip and the glass.
 *
 * Built once as a canonical tube running 0→1 along +Y, then aimed and stretched
 * each frame — rebuilding a TubeGeometry every frame to follow the mouth would
 * cost more than the rest of the scene put together.
 *
 * The profile narrows towards the bottom because a falling stream accelerates
 * and the same volume per second has to fit through a smaller cross-section.
 * That taper, plus a wobble that grows with distance from the lip, is most of
 * what separates "water pouring" from "a cylinder between two points".
 */
export default function PourStream() {
  const meshRef = useRef()

  const geometry = useMemo(() => {
    const HEIGHT_SEGMENTS = 28
    const RADIAL = 14
    const points = []
    for (let i = 0; i <= HEIGHT_SEGMENTS; i++) {
      const t = i / HEIGHT_SEGMENTS
      // sqrt falloff: continuity for a stream under gravity.
      const r = THREE.MathUtils.lerp(1, 0.3, Math.sqrt(t))
      points.push(new THREE.Vector2(r, t))
    }
    const geo = new THREE.LatheGeometry(points, RADIAL)
    geo.computeVertexNormals()
    return geo
  }, [])

  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#7fcdea'),
      roughness: 0.05,
      metalness: 0,
      ior: 1.333,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      side: THREE.DoubleSide,
    })
    m.userData.uniforms = { uTime: { value: 0 }, uWobble: { value: 1 } }
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = m.userData.uniforms.uTime
      shader.uniforms.uWobble = m.userData.uniforms.uWobble
      shader.uniforms.uRimColor = { value: new THREE.Color('#d8f4ff') }
      shader.vertexShader =
        'uniform float uTime;\nuniform float uWobble;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float travel = transformed.y;
           float amp = uWobble * travel * travel * 0.055;
           transformed.x += sin(travel * 19.0 - uTime * 11.0) * amp;
           transformed.z += cos(travel * 15.0 - uTime * 9.0) * amp;`,
        )
      shader.fragmentShader =
        'uniform vec3 uRimColor;\n' +
        shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           float fres = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.5);
           totalEmissiveRadiance += uRimColor * fres * 0.35;`,
        )
    }
    m.customProgramCacheKey = () => 'aquem-pour-stream'
    return m
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const scratch = useMemo(
    () => ({ target: new THREE.Vector3(), dir: new THREE.Vector3(), quat: new THREE.Quaternion() }),
    [],
  )
  const width = useRef(0)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const mesh = meshRef.current
    if (!mesh) return

    const p = sectionProgress('pour')
    const engaged = p > 0.0005 && p < 0.9995
    const phases = pourPhases(engaged ? p : 0)

    material.userData.uniforms.uTime.value += dt
    width.current = THREE.MathUtils.lerp(width.current, engaged ? phases.flow : 0, 1 - Math.exp(-9 * dt))

    if (width.current < 0.01) {
      mesh.visible = false
      return
    }
    mesh.visible = true

    const mouth = bottleRuntime.mouth
    scratch.target.set(GLASS.x, GLASS.floor + bottleRuntime.glassLevel, 0)
    scratch.dir.copy(scratch.target).sub(mouth)
    const distance = scratch.dir.length()
    scratch.dir.divideScalar(distance || 1)

    mesh.position.copy(mouth)
    scratch.quat.setFromUnitVectors(UP, scratch.dir)
    mesh.quaternion.copy(scratch.quat)

    // Radius tracks the flow rate; length always spans lip to water surface.
    const radius = 0.052 * width.current
    mesh.scale.set(radius, distance, radius)
    // Wobble is authored in the canonical tube's units, where the radius is 1;
    // dividing by the real radius keeps the ripple the same size on screen
    // however thick the stream currently is.
    material.userData.uniforms.uWobble.value = 0.16 / Math.max(radius, 0.004)
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} />
}
