import { Suspense, lazy, useCallback, useState } from 'react'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Features from './components/Features.jsx'
import Customize from './components/Customize.jsx'
import Specs from './components/Specs.jsx'
import Footer from './components/Footer.jsx'
import CanvasLoader from './components/CanvasLoader.jsx'
import SceneBoundary from './components/SceneBoundary.jsx'

// three + fiber + drei are ~1 MB of JS; keep them out of the entry chunk so the
// page shell paints first and the loader has something honest to cover.
const Experience = lazy(() => import('./three/Experience.jsx'))

export default function App() {
  const [ready, setReady] = useState(false)
  const markReady = useCallback(() => setReady(true), [])

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
            <Experience onReady={markReady} />
          </Suspense>
        </SceneBoundary>
      </div>

      <Nav />

      {/* Pointer events fall through to the canvas on desktop so the bottle can
          be dragged from anywhere; controls opt back in individually. */}
      <main className="relative z-10 md:pointer-events-none">
        <Hero />
        <Features />
        <Customize />
        <Specs />
        <Footer />
      </main>
    </>
  )
}
