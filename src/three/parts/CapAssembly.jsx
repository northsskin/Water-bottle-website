import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { sectionProgress } from '../../scroll/scrollState.js'
import { bottleRuntime, introRuntime } from '../runtime.js'
import { pourPhases } from '../pour.js'
import { BOTTLE, capRadius, profilePoints } from '../bottleProfile.js'

const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * How far apart the cap is, 0→1, across the pinned section.
 *
 * A bell rather than a ramp: the parts come apart, hold long enough to be read,
 * then seat again before the section leaves. Scrolling back up runs it in
 * reverse, so the beat is reversible rather than a one-shot trigger.
 */
function explodeAmount(p) {
  return smoothstep(0.18, 0.44, p) * (1 - smoothstep(0.62, 0.88, p))
}

/**
 * Each piece travels a different distance — that spread is what turns a cap
 * coming off into an exploded diagram — and its callout is parented to it, so
 * the label tracks the part instead of pointing at where it used to be. The
 * leader lines fan outwards so three labels stacked over one small object do
 * not collide.
 */
const PARTS = [
  { id: 'ring', label: 'Cast pull ring', lift: 0.6, leader: 0.5 },
  { id: 'crown', label: 'Bio-resin crown', lift: 0.34, leader: 0.46 },
  { id: 'gasket', label: 'Silicone gasket', lift: 0.16, leader: 0.32 },
]

function Callout({ part, y, opacityRef }) {
  return (
    <Html
      position={[BOTTLE.rCap + part.leader, y, 0]}
      // Purely decorative: never let a callout eat a drag meant for the bottle.
      style={{ pointerEvents: 'none' }}
      zIndexRange={[20, 10]}
    >
      <div
        ref={(el) => {
          opacityRef.current[part.id] = el
        }}
        style={{ opacity: 0 }}
        className="flex -translate-y-1/2 items-center gap-2 whitespace-nowrap"
      >
        <span className="h-px w-8 bg-ink-900/30" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-600">
          {part.label}
        </span>
      </div>
    </Html>
  )
}

export default function CapAssembly({ showLabels = true }) {
  const root = useRef()
  const crownLift = useRef()
  const crownSpin = useRef()
  const gasketLift = useRef()
  const ringLift = useRef()
  const labels = useRef({})

  const capGeometry = useMemo(
    () => new THREE.LatheGeometry(profilePoints(BOTTLE.capBottom, BOTTLE.capTop, capRadius, 56), 56),
    [],
  )
  useEffect(() => () => capGeometry.dispose(), [capGeometry])

  useFrame(() => {
    // During the opening the very same rig runs backwards: the cap starts lifted
    // and unscrewed, then descends and seats as the intro clock reaches 1.
    // Three things drive this one rig: the opening runs it backwards, the cap
    // section explodes it, and the pour lifts the cap clear so there is a mouth
    // to pour out of. Whichever wants the parts furthest apart wins.
    const pour = sectionProgress('pour')
    const pouring = pour > 0.0005 && pour < 0.9995
    const pourLift = pouring ? pourPhases(pour).capOff : 0
    const t = introRuntime.active
      ? 1 - introRuntime.t * introRuntime.t
      : Math.max(explodeAmount(sectionProgress('cap')), pourLift)

    if (crownLift.current) crownLift.current.position.y = t * 0.34
    if (crownSpin.current) crownSpin.current.rotation.y = -t * 2.4
    if (ringLift.current) ringLift.current.position.y = t * 0.6
    if (gasketLift.current) gasketLift.current.position.y = t * 0.16

    // The cap unscrews, then shrinks away as the bottle tips: parts lift along
    // the bottle's own axis, so a cap left visible at 57 degrees flies off into
    // the corner of frame instead of reading as set aside.
    if (root.current) {
      const put = 1 - THREE.MathUtils.clamp(bottleRuntime.tilt / 0.5, 0, 1)
      root.current.scale.setScalar(put)
      root.current.visible = put > 0.02
    }

    // Labels arrive only once the parts have actually separated, so they never
    // sit on top of an assembled cap — never during the opening, which shares
    // this rig but is a product shot, and never during the pour, where the cap
    // is being removed rather than explained.
    const opacity =
      introRuntime.active || pouring
        ? '0'
        : String(THREE.MathUtils.clamp((t - 0.4) / 0.35, 0, 1))
    for (const part of PARTS) {
      const el = labels.current[part.id]
      if (el) el.style.opacity = opacity
    }
  })

  return (
    <group ref={root}>
      <group ref={crownLift}>
        <group ref={crownSpin}>
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
          {[BOTTLE.capBottom + 0.07, BOTTLE.capBottom + 0.15].map((y) => (
            <mesh key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[BOTTLE.rCap - 0.008, 0.011, 10, 64]} />
              <meshStandardMaterial color="#20242b" roughness={0.35} metalness={0.85} />
            </mesh>
          ))}
        </group>
        {showLabels ? (
          <Callout part={PARTS[1]} y={BOTTLE.capBottom + 0.16} opacityRef={labels} />
        ) : null}
      </group>

      <group ref={gasketLift}>
        <mesh position={[0, BOTTLE.capBottom + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[BOTTLE.rCap - 0.012, 0.016, 10, 56]} />
          <meshStandardMaterial color="#15181d" roughness={0.85} metalness={0} />
        </mesh>
        {showLabels ? (
          <Callout part={PARTS[2]} y={BOTTLE.capBottom + 0.005} opacityRef={labels} />
        ) : null}
      </group>

      <group ref={ringLift}>
        <mesh position={[0, BOTTLE.capTop - 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.082, 0.016, 12, 56]} />
          <meshStandardMaterial color="#cfd4da" roughness={0.22} metalness={1} />
        </mesh>
        {showLabels ? (
          <Callout part={PARTS[0]} y={BOTTLE.capTop - 0.012} opacityRef={labels} />
        ) : null}
      </group>
    </group>
  )
}
