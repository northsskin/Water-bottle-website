import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useConfig } from '../../store.js'
import { CAPACITIES, PRODUCT } from '../../product.js'
import {
  BOTTLE,
  createLabelTexture,
  outerRadius,
  profilePoints,
} from '../bottleProfile.js'

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

export default function Shell({ transmissionEnabled = true }) {
  const capacity = useConfig((s) => s.capacity)
  const finish = useConfig((s) => s.finish)
  const color = useConfig((s) => s.color)

  const geometry = useMemo(() => {
    // 128x64 is ~16k triangles against 160x96's ~31k, and at every framing on
    // the page the silhouette is identical — the profile is smooth, not faceted.
    const geo = new THREE.LatheGeometry(profilePoints(0, BOTTLE.neckTop, outerRadius, 128), 64)
    geo.computeVertexNormals()
    return geo
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  const capacityLabel = CAPACITIES.find((c) => c.id === capacity)?.label ?? '750 ml'
  const labelTexture = useMemo(
    () => createLabelTexture(PRODUCT.brand, PRODUCT.name, capacityLabel, color),
    [capacityLabel, color],
  )
  useEffect(() => () => labelTexture.dispose(), [labelTexture])

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(useConfig.getState().color),
        ior: 1.45,
        specularIntensity: 1,
        // Double-sided so the far wall is drawn behind the liquid — otherwise
        // the empty part of the bottle looks straight through to the page.
        side: THREE.DoubleSide,
        ...FINISH_PRESETS.gloss,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  const tmpColor = useMemo(() => new THREE.Color(), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    const config = useConfig.getState()
    const preset = FINISH_PRESETS[config.finish] ?? FINISH_PRESETS.gloss

    tmpColor.set(config.color)
    material.color.lerp(tmpColor, damp(dt, 8))

    for (const key of ANIMATED_PROPS) {
      let target = preset[key]
      // The cheapest quality lever there is: transmission forces an extra
      // full-scene pass every frame, so the low tier simply does without it.
      if (!transmissionEnabled && (key === 'transmission' || key === 'thickness')) target = 0
      const next = THREE.MathUtils.lerp(material[key], target, damp(dt, 6))
      material[key] = target === 0 && next < 0.004 ? 0 : next
    }
  })

  return (
    <>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />

      <mesh position={[0, BOTTLE.labelCenter, 0]} rotation={[0, Math.PI, 0]}>
        <cylinderGeometry
          args={[
            outerRadius(BOTTLE.labelCenter) + 0.004,
            outerRadius(BOTTLE.labelCenter) + 0.004,
            BOTTLE.labelHeight,
            64,
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
    </>
  )
}
