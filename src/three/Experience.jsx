import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import Backdrop from './Backdrop.jsx'
import Bottle from './Bottle.jsx'
import CameraRig from './CameraRig.jsx'
import Intro from './Intro.jsx'
import Effects from './Effects.jsx'
import CausticsFloor from './CausticsFloor.jsx'
import Stats from './Stats.jsx'
import { useQuality } from './quality.js'
import { useIsMobile, usePrefersReducedMotion } from '../hooks.js'

/**
 * A studio softbox rig baked into an environment map. Built from Lightformers
 * rather than a downloaded HDRI so the scene has zero external assets.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#101418']} />
      <Lightformer
        form="rect"
        intensity={3.2}
        position={[0, 5, 1]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[8, 8, 1]}
      />
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

function Scene({ isMobile, reducedMotion, quality, introDone, skipIntro, onIntroDone }) {
  const gl = useThree((s) => s.gl)

  // The transmission pass renders the whole scene again; shrinking its target is
  // the cheapest way to keep refraction on a weak GPU.
  useEffect(() => {
    gl.transmissionResolutionScale = quality.transmissionScale
  }, [gl, quality.transmissionScale])

  return (
    <>
      <Backdrop />
      <StudioEnvironment />

      <ambientLight intensity={0.35} />
      <pointLight position={[3, 4, 3]} intensity={22} distance={14} decay={2} />
      <pointLight position={[-3.5, 2.2, 2]} intensity={12} distance={12} decay={2} color="#dceaff" />
      <pointLight position={[0, 1.2, -3.5]} intensity={9} distance={10} decay={2} color="#ffd9b8" />

      <Bottle isMobile={isMobile} reducedMotion={reducedMotion} quality={quality} />

      {quality.caustics && !reducedMotion ? <CausticsFloor /> : null}

      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.5}
        scale={7}
        blur={2.2}
        far={3.2}
        resolution={quality.shadowResolution}
        color="#1d2733"
        frames={quality.shadowFrames}
      />

      {/* Kept mounted until it reports done, so that skipping still runs its
          teardown — that is what restores exposure after the black open. */}
      {!introDone ? (
        <Intro
          isMobile={isMobile}
          skipped={reducedMotion || skipIntro}
          onDone={onIntroDone}
        />
      ) : null}
      <CameraRig isMobile={isMobile} enabled={introDone} />
    </>
  )
}

export default function Experience({ onReady, onIntroDone, skipIntro }) {
  const isMobile = useIsMobile()
  const reducedMotion = usePrefersReducedMotion()
  const { quality, decline } = useQuality(isMobile)
  const [introDone, setIntroDone] = useState(false)

  const finishIntro = useMemo(
    () => () => {
      setIntroDone(true)
      onIntroDone?.()
    },
    [onIntroDone],
  )

  // Opt-in diagnostics: append ?stats to the URL to see frame rate, draw calls
  // and which tier the page settled on.
  const showStats =
    typeof window !== 'undefined' && window.location.search.includes('stats')

  // The composer's depth-of-field focuses on the bottle's mid-height, which is
  // roughly where every keyframe is aimed.
  const focusDistance = isMobile ? 0.02 : 0.012

  return (
    <Canvas
      // `pan-y` hands vertical gestures back to the document, so a phone can
      // still scroll the page while sideways drags rotate the product.
      style={{ touchAction: 'pan-y' }}
      dpr={[1, quality.dpr]}
      gl={{ antialias: !quality.bloom, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 2.5, 7.7], fov: 35, near: 0.1, far: 100 }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true
        // Starts black only when there is an intro to bring the lights up.
        gl.toneMappingExposure = reducedMotion || skipIntro ? 1.05 : 0
        onReady?.()
      }}
    >
      <PerformanceMonitor onDecline={decline} flipflops={2} ms={250} iterations={6}>
        <Suspense fallback={null}>
          <Scene
            isMobile={isMobile}
            reducedMotion={reducedMotion}
            quality={quality}
            introDone={introDone}
            skipIntro={skipIntro}
            onIntroDone={finishIntro}
          />
        </Suspense>
        <Effects quality={quality} focusDistance={focusDistance} />
        {showStats ? <Stats quality={quality} /> : null}
      </PerformanceMonitor>
    </Canvas>
  )
}
