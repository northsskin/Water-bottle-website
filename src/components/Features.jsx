import { FEATURES } from '../product.js'
import { useStorySection } from '../scroll/sections.js'
import { Icon } from './Icons.jsx'
import Reveal from './Reveal.jsx'
import SplitText from './motion/SplitText.jsx'
import CountUp from './motion/CountUp.jsx'
import { glassOnMobile } from './ui.js'

function Card({ feature, index }) {
  return (
    <div className={`w-full md:max-w-md ${glassOnMobile}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500/10 text-accent-600">
          <Icon name={feature.icon} />
        </span>
        <span className="text-xs tabular-nums tracking-[0.24em] text-ink-400">
          {String(index + 1).padStart(2, '0')} / {String(FEATURES.length).padStart(2, '0')}
        </span>
      </div>

      <SplitText
        as="h3"
        text={feature.title}
        className="mt-6 text-3xl font-medium leading-tight tracking-[-0.02em] text-ink-900 lg:text-4xl"
      />

      <Reveal delay={0.12}>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-600">{feature.body}</p>

        <div className="mt-7 flex items-baseline gap-3 border-t border-ink-900/8 pt-5">
          <CountUp
            value={feature.stat}
            className="text-2xl font-medium tabular-nums text-ink-900"
          />
          <span className="text-xs uppercase tracking-[0.16em] text-ink-400">
            {feature.statLabel}
          </span>
        </div>
      </Reveal>
    </div>
  )
}

/**
 * A feature that is also a 3D set piece. The tall outer element is pure scroll
 * runway — it is what gives the cap enough travel to come apart and back
 * together — while the sticky inner panel keeps the copy on screen throughout.
 */
function PinnedFeature({ feature, index }) {
  // Measured across the *pinned* window, not the whole travel through the
  // viewport. With the default range, progress 0→1 spans the section entering
  // and leaving, so most of the set piece played while it was still sliding
  // into view — the opening beats were over before the card ever pinned.
  // 'start start' is the moment the sticky child engages, 'end end' the moment
  // it releases.
  const ref = useStorySection(feature.section, ['start start', 'end end'])

  return (
    <section ref={ref} id={feature.section} className="relative h-[220vh]">
      {/* On a phone the copy sits over the bottle, so it is pinned to the
          bottom of the viewport and the set piece plays in the space above it.
          On desktop the bottle has its own column and the card centres. */}
      <div className="sticky top-0 flex h-screen items-end pb-10 md:items-center md:pb-0 md:pointer-events-auto">
        <Card feature={feature} index={index} />
      </div>
    </section>
  )
}

function PlainFeature({ feature, index }) {
  const ref = useStorySection(feature.section)

  return (
    <section
      ref={ref}
      id={feature.section}
      className="flex min-h-[90vh] items-center md:pointer-events-auto"
    >
      <Card feature={feature} index={index} />
    </section>
  )
}

export default function Features() {
  return (
    <div className="relative px-6 lg:px-10">
      <div className="mx-auto grid max-w-7xl md:grid-cols-2">
        <div>
          <Reveal className={`mt-24 md:pointer-events-auto ${glassOnMobile}`}>
            <p className="eyebrow">Why it is built this way</p>
            <SplitText
              text="Four decisions you can feel."
              className="mt-4 max-w-sm text-balance text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-ink-900 lg:text-5xl"
            />
          </Reveal>

          {FEATURES.map((feature, index) =>
            feature.pinned ? (
              <PinnedFeature key={feature.id} feature={feature} index={index} />
            ) : (
              <PlainFeature key={feature.id} feature={feature} index={index} />
            ),
          )}
        </div>

        {/* Right half stays empty on desktop — the bottle slides into it. */}
        <div aria-hidden="true" className="hidden md:block" />
      </div>
    </div>
  )
}
