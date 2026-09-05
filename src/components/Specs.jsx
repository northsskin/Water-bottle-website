import { SPECS } from '../product.js'
import { useStorySection } from '../scroll/sections.js'
import Reveal from './Reveal.jsx'
import { glassOnMobile } from './ui.js'

export default function Specs() {
  const ref = useStorySection('specs')

  return (
    <section id="specs" ref={ref} className="relative flex min-h-[110vh] items-center px-6 py-28 lg:px-10 lg:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div className="md:pointer-events-auto">
          <Reveal className={glassOnMobile}>
            <p className="eyebrow">The numbers</p>
            <h2 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-ink-900 lg:text-5xl">
              Specifications
            </h2>
          </Reveal>

          <Reveal
            delay={0.1}
            className="mt-10 rounded-3xl border border-ink-900/6 bg-bone-50/85 p-2 shadow-soft backdrop-blur-md"
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2">
              {SPECS.map((spec) => (
                <div
                  key={spec.label}
                  className="border-b border-ink-900/6 px-5 py-4 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
                >
                  <dt className="text-xs uppercase tracking-[0.14em] text-ink-400">
                    {spec.label}
                  </dt>
                  <dd className="mt-1.5 text-[15px] text-ink-900">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        {/* Right half stays empty on desktop — the bottle slides into it. */}
        <div aria-hidden="true" className="hidden md:block" />
      </div>
    </section>
  )
}
