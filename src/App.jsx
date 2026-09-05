import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Features from './components/Features.jsx'
import Customize from './components/Customize.jsx'
import Specs from './components/Specs.jsx'
import Footer from './components/Footer.jsx'
import CanvasLoader from './components/CanvasLoader.jsx'
import SceneBoundary from './components/SceneBoundary.jsx'
import ProgressRail from './components/motion/ProgressRail.jsx'
import { useSmoothScroll } from './scroll/useSmoothScroll.js'
import { usePrefersReducedMotion } from './hooks.js'

// three + fiber + drei + postprocessing are ~1 MB of JS; keep them out of the
// entry chunk so the page shell paints first and the loader has something
// honest to cover.
const Experience = lazy(() => import('./three/Experience.jsx'))

export default function App() {
  const reducedMotion = usePrefersReducedMotion()
  const [ready, setReady] = useState(false)
  const [introDone, setIntroDone] = useState(reducedMotion)
  const [skipIntro, setSkipIntro] = useState(false)

  useSmoothScroll(!reducedMotion)

  const markReady = useCallback(() => setReady(true), [])
  const finishIntro = useCallback(() => setIntroDone(true), [])

  // Nothing should move under the visitor before the opening has played, and a
  // scroll during it is a clear "get on with it".
  useEffect(() => {
    if (introDone || reducedMotion) return
    const skip = () => setSkipIntro(true)
    window.addEventListener('wheel', skip, { passive: true, once: true })
    window.addEventListener('touchmove', skip, { passive: true, once: true })
    window.addEventListener('keydown', skip, { once: true })
    return () => {
      window.removeEventListener('wheel', skip)
      window.removeEventListener('touchmove', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [introDone, reducedMotion])

  const playingIntro = ready && !introDone && !reducedMotion

  return (
    <>
      <CanvasLoader ready={ready} />

      {/* Neutral studio backdrop behind the canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(120%_80%_at_50%_0%,#ffffff_0%,#f4f2ed_45%,#e9e6de_100%)]"
      />

      <div className="fixed inset-0 z-0">
        <SceneBoundary onError={markReady}>
          <Suspense fallback={null}>
            <Experience
              onReady={markReady}
              onIntroDone={finishIntro}
              skipIntro={skipIntro}
            />
          </Suspense>
        </SceneBoundary>
      </div>

      <Nav />
      <ProgressRail />

      <AnimatePresence>
        {playingIntro && (
          <motion.button
            type="button"
            onClick={() => setSkipIntro(true)}
            className="fixed bottom-8 right-8 z-40 rounded-full border border-ink-900/12 bg-bone-50/80 px-4 py-2 text-xs uppercase tracking-[0.16em] text-ink-600 backdrop-blur-md transition-colors hover:text-ink-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.6 }}
          >
            Skip intro
          </motion.button>
        )}
      </AnimatePresence>

      {/* Pointer events fall through to the canvas on desktop so the bottle can
          be dragged from anywhere; controls opt back in individually. */}
      <main className="relative z-10 md:pointer-events-none">
        <Hero introDone={introDone} />
        <Features />
        <Customize />
        <Specs />
        <Footer />
      </main>
    </>
  )
}
