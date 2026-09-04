import { FEATURES } from '../product.js'
import { useFocusTrigger } from '../hooks.js'
import { useConfig } from '../store.js'
import { Icon } from './Icons.jsx'
import Reveal from './Reveal.jsx'
import { glassOnMobile } from './ui.js'

function FeatureBlock({ feature, index }) {
  const ref = useFocusTrigger(feature.focus)
  const setFocus = useConfig((s) => s.setFocus)

  return (
    <div
      ref={ref}
      onMouseEnter={() => setFocus(feature.focus)}
      className="flex min-h-[72vh] items-center md:pointer-events-auto"
    >
      <Reveal className={`w-full md:max-w-md ${glassOnMobile}`}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500/10 text-accent-600">
            <Icon name={feature.icon} />
          </span>
          <span className="text-xs tabular-nums tracking-[0.24em] text-ink-400">
            {String(index + 1).padStart(2, '0')} / {String(FEATURES.length).padStart(2, '0')}
          </span>
        </div>

        <h3 className="mt-6 text-3xl font-medium leading-tight tracking-[-0.02em] text-ink-900 lg:text-4xl">
          {feature.title}
        </h3>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-600">{feature.body}</p>

        <div className="mt-7 flex items-baseline gap-3 border-t border-ink-900/8 pt-5">
          <span className="text-2xl font-medium tabular-nums text-ink-900">{feature.stat}</span>
          <span className="text-xs uppercase tracking-[0.16em] text-ink-400">
            {feature.statLabel}
          </span>
        </div>
      </Reveal>
    </div>
  )
}

export default function Features() {
  return (
    <section id="features" className="relative px-6 lg:px-10">
      <div className="mx-auto grid max-w-7xl md:grid-cols-2">
        <div>
          <Reveal className={`mt-24 md:pointer-events-auto ${glassOnMobile}`}>
            <p className="eyebrow">Why it is built this way</p>
            <h2 className="mt-4 max-w-sm text-balance text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-ink-900 lg:text-5xl">
              Four decisions you can feel.
            </h2>
          </Reveal>

          {FEATURES.map((feature, index) => (
            <FeatureBlock key={feature.id} feature={feature} index={index} />
          ))}
        </div>

        {/* Right half stays empty on desktop — the bottle slides into it. */}
        <div aria-hidden="true" className="hidden md:block" />
      </div>
    </section>
  )
}
