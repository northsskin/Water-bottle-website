import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sectionProgress } from '../scroll/scrollState.js'

/**
 * Light patterns cast on the floor under the bottle during the pour.
 *
 * Deliberately procedural rather than drei's <Caustics>, which renders the
 * refractive object to an offscreen target every frame — real caustics on a
 * clipped, transmissive, animated liquid would cost more than the whole rest of
 * the scene. Layered sine interference reads the same at this scale and costs
 * one small additive plane.
 */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;

  void main() {
    vec2 p = (vUv - 0.5) * 9.0;

    // Three drifting wave sets; where their crests coincide you get the bright
    // filaments that read as caustics.
    float w = 0.0;
    w += sin(p.x * 1.7 + uTime * 0.9) * sin(p.y * 1.5 - uTime * 0.7);
    w += sin((p.x + p.y) * 1.3 - uTime * 1.1) * 0.8;
    w += sin(length(p) * 2.1 - uTime * 1.4) * 0.6;

    float caustic = pow(max(w * 0.4 + 0.5, 0.0), 4.0);

    // Fade to nothing at the edges so the plane never shows its own silhouette.
    float falloff = smoothstep(1.0, 0.25, length(vUv - 0.5) * 2.0);

    float alpha = caustic * falloff * uOpacity;
    if (alpha < 0.004) discard;
    // Normal blending, not additive: the floor is nearly white, so there is no
    // headroom above it to add light into. A tinted pool laid over the contact
    // shadow is what actually reads as water throwing light around.
    gl_FragColor = vec4(uColor, alpha);
  }
`

export default function CausticsFloor() {
  const materialRef = useRef()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color('#6fc6ea') },
    }),
    [],
  )

  useFrame((state, delta) => {
    uniforms.uTime.value += delta
    const p = sectionProgress('pour')
    // Present only while the pour is on screen, brightest at the section's middle.
    const presence = p > 0.001 && p < 0.999 ? Math.sin(p * Math.PI) : 0
    uniforms.uOpacity.value = THREE.MathUtils.lerp(
      uniforms.uOpacity.value,
      presence * 0.75,
      Math.min(delta * 4, 1),
    )
    if (materialRef.current) materialRef.current.visible = uniforms.uOpacity.value > 0.004
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
      <planeGeometry args={[4.5, 4.5]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
