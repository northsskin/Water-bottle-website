import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useConfig } from '../store.js'
import { CAPACITIES, PRODUCT } from '../product.js'
import { resolvePose } from './poses.js'
import {
  BOTTLE,
  capRadius,
  createLabelTexture,
  fillHeight,
  innerRadius,
  outerRadius,
  profilePoints,
} from './bottleProfile.js'

/**
 * Shell material per finish. `transmission` is what lets the liquid read through
 * the wall — three.js renders transmissive materials against a backdrop built
 * from the opaque objects, and the liquid is one of them. Chrome has no
 * transmission, so it is genuinely opaque and hides the fill.
 */
const FINISH_PRESETS = {
  gloss: {
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transmission: 0.86,
    thickness: 0.25,
    envMapIntensity: 1.1,
  },
  frosted: {
    roughness: 0.58,
    metalness: 0.02,
    clearcoat: 0.28,
    clearcoatRoughness: 0.55,
    transmission: 0.5,
    thickness: 0.9,
    envMapIntensity: 0.85,
  },
  chrome: {
    roughness: 0.15,
    metalness: 1,
    clearcoat: 0.65,
    clearcoatRoughness: 0.08,
    transmission: 0,
    thickness: 0,
    envMapIntensity: 1.35,
  },
}

const ANIMATED_PROPS = [
  'roughness',
  'metalness',
  'clearcoat',
  'clearcoatRoughness',
  'transmission',
  'thickness',
  'envMapIntensity',
]

const damp = (delta, speed) => 1 - Math.exp(-speed * delta)

export default function Bottle({ isMobile = false, reducedMotion = false }) {
  const spinGroup = useRef()
  const scaleGroup = useRef()
  const liquidRef = useRef()
  const surfaceRef = useRef()

  const capacity = useConfig((s) => s.capacity)
  const finish = useConfig((s) => s.finish)
  const color = useConfig((s) => s.color)

  // ---------------------------------------------------------------- geometry
  const shellGeometry = useMemo(() => {
    const geo = new THREE.LatheGeometry(
      profilePoints(0, BOTTLE.neckTop, outerRadius, 160),
      96,
    )
    geo.computeVertexNormals()
    return geo
  }, [])

  const liquidGeometry = useMemo(() => {
    const geo = new THREE.LatheGeometry(
      profilePoints(BOTTLE.wall, BOTTLE.fillMax + 0.06, innerRadius, 120),
      72,
    )
    geo.computeVertexNormals()
    return geo
  }, [])

  const capGeometry = useMemo(
    () =>
      new THREE.LatheGeometry(
        profilePoints(BOTTLE.capBottom, BOTTLE.capTop, capRadius, 72),
        72,
      ),
    [],
  )

  useEffect(() => {
    return () => {
      shellGeometry.dispose()
      liquidGeometry.dispose()
      capGeometry.dispose()
    }
  }, [shellGeometry, liquidGeometry, capGeometry])

  // ----------------------------------------------------------------- texture
  const capacityLabel = CAPACITIES.find((c) => c.id === capacity)?.label ?? '750 ml'
  const labelTexture = useMemo(
    () => createLabelTexture(PRODUCT.brand, PRODUCT.name, capacityLabel, color),
    [capacityLabel, color],
  )
  useEffect(() => () => labelTexture.dispose(), [labelTexture])

  // --------------------------------------------------------------- materials
  const shellMaterial = useMemo(() => {
    const preset = FINISH_PRESETS.gloss
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(useConfig.getState().color),
      ior: 1.45,
      specularIntensity: 1,
      // Double-sided so the far wall is drawn behind the liquid — otherwise the
      // empty part of the bottle looks straight through to the page.
      side: THREE.DoubleSide,
      ...preset,
    })
  }, [])

  /**
   * The liquid must stay *opaque*: three.js builds the transmission backdrop
   * from the opaque render list only, so a transparent or transmissive liquid
   * would be invisible through the shell. Its watery quality comes from the
   * shell refracting it, plus a hand-rolled fresnel rim patched into the
   * emissive term so the edges of the volume catch light.
   */
  const liquidMaterial = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#5cb8e0'),
      roughness: 0.08,
      metalness: 0,
      ior: 1.333,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide,
    })
    material.onBeforeCompile = (shader) => {
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
    material.customProgramCacheKey = () => 'aquem-liquid-fresnel'
    return material
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

  useEffect(() => {
    return () => {
      shellMaterial.dispose()
      liquidMaterial.dispose()
      surfaceMaterial.dispose()
    }
  }, [shellMaterial, liquidMaterial, surfaceMaterial])

  // The fill level is a world-space clipping plane: everything above the plane
  // is cut away, so the level animates without rebuilding geometry.
  const clipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, -1, 0), fillHeight(useConfig.getState().fill)),
    [],
  )
  useEffect(() => {
    liquidMaterial.clippingPlanes = [clipPlane]
    liquidMaterial.clipShadows = true
    return () => {
      liquidMaterial.clippingPlanes = null
    }
  }, [liquidMaterial, clipPlane])

  // Finish changes ease in rather than snapping.
  const finishTarget = useRef(FINISH_PRESETS[finish] ?? FINISH_PRESETS.gloss)
  finishTarget.current = FINISH_PRESETS[finish] ?? FINISH_PRESETS.gloss

  const tmpColor = useMemo(() => new THREE.Color(), [])
  const smoothed = useRef({ fillY: fillHeight(useConfig.getState().fill), scale: 1 })

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1)
    const config = useConfig.getState()
    const pose = resolvePose(config.focus, isMobile)
    const s = smoothed.current

    // --- material: colour + finish -----------------------------------------
    tmpColor.set(config.color)
    shellMaterial.color.lerp(tmpColor, damp(dt, 8))
    for (const key of ANIMATED_PROPS) {
      const target = finishTarget.current[key]
      const next = THREE.MathUtils.lerp(shellMaterial[key], target, damp(dt, 6))
      shellMaterial[key] = target === 0 && next < 0.004 ? 0 : next
    }

    // --- fill level ---------------------------------------------------------
    const capacityScale = CAPACITIES.find((c) => c.id === config.capacity)?.scale ?? 1
    s.scale = THREE.MathUtils.lerp(s.scale, capacityScale, damp(dt, 6))
    s.fillY = THREE.MathUtils.lerp(s.fillY, fillHeight(config.fill), damp(dt, 5))

    const bob = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.4) * 0.004
    const worldFillY = (s.fillY + bob) * s.scale
    clipPlane.constant = worldFillY

    if (scaleGroup.current) {
      // Taller sizes gain a little girth too, but not proportionally — that is
      // how the real family of bottles is designed.
      const lateral = 1 + (s.scale - 1) * 0.35
      scaleGroup.current.scale.set(lateral, s.scale, lateral)
    }
    if (surfaceRef.current) {
      const r = innerRadius(s.fillY) - 0.004
      surfaceRef.current.position.y = s.fillY + bob
      surfaceRef.current.scale.set(r, r, r)
      surfaceRef.current.visible = config.fill > 0.015
    }
    if (liquidRef.current) liquidRef.current.visible = config.fill > 0.015

    // --- idle rotation ------------------------------------------------------
    if (spinGroup.current) {
      if (pose.spin === null || pose.spin === undefined) {
        if (!config.interacting && !reducedMotion) spinGroup.current.rotation.y += dt * 0.16
      } else {
        // Ease to the angle that puts this detail in front of the camera,
        // taking the short way round.
        const current = spinGroup.current.rotation.y
        const delta2 = ((pose.spin - current + Math.PI) % (Math.PI * 2)) - Math.PI
        spinGroup.current.rotation.y = current + delta2 * damp(dt, 2.5)
      }
    }
  })

  return (
    <group>
      <group ref={spinGroup}>
        <group ref={scaleGroup}>
          {/* Shell */}
          <mesh geometry={shellGeometry} material={shellMaterial} castShadow receiveShadow />

          {/* Liquid volume, cut off at the fill line */}
          <mesh ref={liquidRef} geometry={liquidGeometry} material={liquidMaterial} />
          <mesh ref={surfaceRef} material={surfaceMaterial} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1, 64]} />
          </mesh>

          {/* Wrap-around label */}
          <mesh position={[0, BOTTLE.labelCenter, 0]} rotation={[0, Math.PI, 0]}>
            <cylinderGeometry
              args={[
                outerRadius(BOTTLE.labelCenter) + 0.004,
                outerRadius(BOTTLE.labelCenter) + 0.004,
                BOTTLE.labelHeight,
                96,
                1,
                true,
              ]}
            />
            <meshPhysicalMaterial
              map={labelTexture}
              transparent
              roughness={0.45}
              metalness={0}
              clearcoat={0.4}
              depthWrite={false}
              side={THREE.FrontSide}
            />
          </mesh>

          {/* Cap */}
          <mesh geometry={capGeometry} castShadow>
            <meshPhysicalMaterial
              color="#2b3038"
              roughness={0.17}
              metalness={0.9}
              clearcoat={0.7}
              clearcoatRoughness={0.1}
              envMapIntensity={1.4}
            />
          </mesh>

          {/* Grip ridges + gasket + pull ring */}
          {[BOTTLE.capBottom + 0.07, BOTTLE.capBottom + 0.15].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[BOTTLE.rCap - 0.008, 0.011, 12, 96]} />
              <meshStandardMaterial color="#20242b" roughness={0.35} metalness={0.85} />
            </mesh>
          ))}
          <mesh position={[0, BOTTLE.capBottom + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[BOTTLE.rCap - 0.012, 0.016, 12, 72]} />
            <meshStandardMaterial color="#15181d" roughness={0.85} metalness={0} />
          </mesh>
          <mesh position={[0, BOTTLE.capTop - 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.072, 0.015, 14, 72]} />
            <meshStandardMaterial color="#cfd4da" roughness={0.22} metalness={1} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
