import { CAPACITIES, COLORS, FINISHES, PRODUCT } from '../product.js'
import { useConfig } from '../store.js'
import { useStorySection } from '../scroll/sections.js'
import { Icon, Social } from './Icons.jsx'
import Reveal from './Reveal.jsx'

const SOCIALS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
  { id: 'youtube', label: 'YouTube' },
]

export default function Footer() {
  const ref = useStorySection('final')
  const color = useConfig((s) => s.color)
  const finish = useConfig((s) => s.finish)
  const capacity = useConfig((s) => s.capacity)

  const summary = [
    COLORS.find((c) => c.hex === color)?.label,
    FINISHES.find((f) => f.id === finish)?.label,
    CAPACITIES.find((c) => c.id === capacity)?.label,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section id="final" ref={ref} className="relative px-6 pb-10 pt-28 lg:px-10 lg:pt-36">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Left half stays empty on desktop — the bottle slides into it. */}
          <div aria-hidden="true" className="hidden md:block" />

          <Reveal className="rounded-3xl border border-ink-900/6 bg-bone-50/85 p-10 text-center shadow-lift backdrop-blur-md md:pointer-events-auto md:text-left">
            <p className="eyebrow">Ready when you are</p>
            <h2 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-ink-900 lg:text-5xl">
              {PRODUCT.name}
            </h2>
            <p className="mt-3 text-sm text-ink-600">{summary}</p>

            <button
              type="button"
              className="pointer-events-auto group mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-8 py-4 text-sm font-medium text-bone-50 transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
            >
              Add to cart — $48
              <Icon
                name="arrow"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              />
            </button>

            <p className="mt-4 text-xs text-ink-400">
              Free shipping over $60 · 60-day returns · Lifetime seal warranty
            </p>
          </Reveal>
        </div>

        <footer className="mt-24 flex flex-col gap-6 border-t border-ink-900/8 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold tracking-[0.32em] text-ink-900">{PRODUCT.brand}</p>

          <nav className="flex items-center gap-5">
            {SOCIALS.map((social) => (
              <a
                key={social.id}
                href="#final"
                aria-label={social.label}
                className="pointer-events-auto text-ink-400 transition-colors hover:text-ink-900"
              >
                <Social name={social.id} />
              </a>
            ))}
          </nav>

          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} {PRODUCT.brand}. Concept demo — nothing is for sale.
          </p>
        </footer>
      </div>
    </section>
  )
}
