import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Bottle from './Bottle.jsx'
import { resolvePose } from './poses.js'
import { useConfig } from '../store.js'
import { CAPACITIES } from '../product.js'
import { useIsMobile, usePrefersReducedMotion } from '../hooks.js'

const damp = (delta, speed) => 1 - Math.exp(-speed * delta)

/**
 * Glides the camera between the poses in poses.js as the page scrolls, and gets
 * out of the way while the visitor is dragging the bottle around.
 */
function CameraRig({ isMobile }) {
  const controls = useRef()
  const { camera } = useThree()
  const scratch = useMemo(
    () => ({
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
    }),
    [],
  )
  const releaseTimer = useRef(null)
  const capacityScale = useRef(1)

  useEffect(() => () => clearTimeout(releaseTimer.current), [])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    const { focus, interacting, capacity } = useConfig.getState()
    const pose = resolvePose(focus, isMobile)
    const desired = scratch

    // A 1 L bottle is 12% taller, so every height in the pose rides along with
    // it — otherwise the cap close-up would frame empty space above the cap.
    const scaleTarget = CAPACITIES.find((c) => c.id === capacity)?.scale ?? 1
    capacityScale.current = THREE.MathUtils.lerp(capacityScale.current, scaleTarget, damp(dt, 6))
    const heightScale = capacityScale.current

    desired.position.set(pose.position[0], pose.position[1] * heightScale, pose.position[2])
    desired.target.set(pose.target[0], pose.target[1] * heightScale, pose.target[2])

    // Slide the whole rig sideways rather than moving the bottle, so the
    // framing stays exactly as authored while the subject lands off-centre.
    if (pose.offset) {
      desired.forward.copy(desired.target).sub(desired.position)
      const distance = desired.forward.length()
      desired.forward.divideScalar(distance || 1)
      desired.right.crossVectors(desired.forward, camera.up).normalize()

      const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance
      const shift = pose.offset * 2 * halfHeight * camera.aspect
      desired.position.addScaledVector(desired.right, -shift)
      desired.target.addScaledVector(desired.right, -shift)
    }

    if (!interacting) {
      const k = damp(dt, 1.9)
      camera.position.lerp(desired.position, k)
      if (controls.current) controls.current.target.lerp(desired.target, k)
      else camera.lookAt(desired.target)
    }
    controls.current?.update()
  })

  const onStart = () => {
    clearTimeout(releaseTimer.current)
    useConfig.getState().setInteracting(true)
  }

  // Hold the camera where the visitor left it for a moment before resuming the
  // scroll choreography, so it never yanks out from under their cursor.
  const onEnd = () => {
    clearTimeout(releaseTimer.current)
    releaseTimer.current = setTimeout(() => useConfig.getState().setInteracting(false), 1800)
  }

  if (isMobile) return null

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      onStart={onStart}
      onEnd={onEnd}
      enableDamping
      dampingFactor={0.075}
      rotateSpeed={0.55}
      enablePan={false}
      /* Wheel events belong to the page, not the camera — the scroll position is
         what drives the framing. Distance bounds are kept for the rig itself. */
      enableZoom={false}
      minDistance={1.6}
      maxDistance={7.5}
      minPolarAngle={0.5}
      maxPolarAngle={2.05}
    />
  )
}

/**
 * A studio softbox rig baked into an environment map. Built from Lightformers
 * rather than a downloaded HDRI so the scene has zero external assets.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#101418']} />
      {/* Key softbox overhead */}
      <Lightformer
        form="rect"
        intensity={3.2}
        position={[0, 5, 1]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8, 8, 1]}
      />
      {/* Tall strips either side for the vertical edge highlights */}
      <Lightformer
        form="rect"
        intensity={2.4}
        position={[-4, 1.6, 2]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[3, 6, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.6}
        position={[4.5, 1.6, 1]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[2.5, 6, 1]}
      />
      {/* Warm kicker from behind and a cool bounce off the floor */}
      <Lightformer
        form="circle"
        intensity={1.8}
        color="#ffd9b0"
        position={[1.5, 2.5, -4]}
        scale={3}
      />
      <Lightformer
        form="rect"
        intensity={0.7}
        color="#cfe6ff"
        position={[0, -2, 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[8, 8, 1]}
      />
    </Environment>
  )
}

function Scene({ isMobile, reducedMotion }) {
  return (
    <>
      <StudioEnvironment />

      {/* Two or three practicals on top of the environment for crisp speculars */}
      <ambientLight intensity={0.35} />
      <pointLight position={[3, 4, 3]} intensity={22} distance={14} decay={2} />
      <pointLight position={[-3.5, 2.2, 2]} intensity={12} distance={12} decay={2} color="#dceaff" />
      <pointLight position={[0, 1.2, -3.5]} intensity={9} distance={10} decay={2} color="#ffd9b8" />

      <Bottle isMobile={isMobile} reducedMotion={reducedMotion} />

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.5}
        scale={7}
        blur={2.2}
        far={3.2}
        resolution={isMobile ? 256 : 512}
        color="#1d2733"
        frames={Infinity}
      />
    </>
  )
}

export default function Experience({ onReady }) {
  const isMobile = useIsMobile()
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Canvas
      /* Touch drags have to stay with the document on phones, so the canvas
         only takes pointer input on pointer-precise devices. */
      style={{ pointerEvents: isMobile ? 'none' : 'auto' }}
      dpr={[1, isMobile ? 1.5 : 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      /* Start on the hero pose so the first frame needs no catch-up. */
      camera={{ position: [0, 2.5, 7.7], fov: 35, near: 0.1, far: 100 }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true
        gl.toneMappingExposure = 1.05
        onReady?.()
      }}
    >
      <Suspense fallback={null}>
        <Scene isMobile={isMobile} reducedMotion={reducedMotion} />
      </Suspense>
      <CameraRig isMobile={isMobile} />
    </Canvas>
  )
}
