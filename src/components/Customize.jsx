import { AnimatePresence, motion } from 'framer-motion'
import { CAPACITIES, COLORS, FINISHES } from '../product.js'
import { useConfig } from '../store.js'
import { useStorySection } from '../scroll/sections.js'
import { Icon } from './Icons.jsx'
import Reveal from './Reveal.jsx'
import { glassOnMobile } from './ui.js'

function Field({ label, value, children }) {
  return (
    <div className="border-t border-ink-900/8 pt-6 first:border-0 first:pt-0">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="text-sm text-ink-600">{value}</span>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

export default function Customize() {
  const ref = useStorySection('customize')
  // Individual selectors: the store also carries per-frame scene state, and this
  // panel should not re-render every time the camera focus changes.
  const color = useConfig((s) => s.color)
  const finish = useConfig((s) => s.finish)
  const capacity = useConfig((s) => s.capacity)
  const fill = useConfig((s) => s.fill)
  const setColor = useConfig((s) => s.setColor)
  const setFinish = useConfig((s) => s.setFinish)
  const setCapacity = useConfig((s) => s.setCapacity)
  const setFill = useConfig((s) => s.setFill)

  const activeColor = COLORS.find((c) => c.hex === color)
  const activeCapacity = CAPACITIES.find((c) => c.id === capacity)

  return (
    <section id="customize" ref={ref} className="relative flex min-h-[110vh] items-center px-6 py-28 lg:px-10 lg:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        {/* Left half stays empty on desktop — the bottle slides into it. */}
        <div aria-hidden="true" className="hidden md:block" />

        <Reveal className="pointer-events-auto">
          <div className={glassOnMobile}>
            <p className="eyebrow">Make it yours</p>
            <h2 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-ink-900 lg:text-5xl">
              Six colours.
              <br />
              Three finishes.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-600">
              Every combination is rendered live — nothing here is a photograph.
            </p>
          </div>

          <div className="mt-6 space-y-6 md:mt-10 rounded-3xl border border-ink-900/6 bg-bone-50/85 p-7 shadow-soft backdrop-blur-md">
            <Field label="Colour" value={activeColor?.label ?? 'Custom'}>
              <div className="flex flex-wrap gap-3">
                {COLORS.map((swatch) => {
                  const selected = swatch.hex === color
                  return (
                    <button
                      key={swatch.id}
                      type="button"
                      onClick={() => setColor(swatch.hex)}
                      aria-pressed={selected}
                      aria-label={swatch.label}
                      title={swatch.label}
                      className={`relative h-10 w-10 rounded-full transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-500 ${
                        selected
                          ? 'ring-2 ring-ink-900 ring-offset-2 ring-offset-bone-50'
                          : 'ring-1 ring-ink-900/10'
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    >
                      <AnimatePresence>
                        {selected && (
                          <motion.span
                            className="absolute inset-0 flex items-center justify-center text-white mix-blend-difference"
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ duration: 0.18 }}
                          >
                            <Icon name="check" className="h-4 w-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  )
                })}
              </div>
            </Field>

            <Field label="Finish" value={FINISHES.find((f) => f.id === finish)?.note ?? ''}>
              <div className="grid grid-cols-3 gap-2">
                {FINISHES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFinish(option.id)}
                    aria-pressed={finish === option.id}
                    className={`rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      finish === option.id
                        ? 'bg-ink-900 text-bone-50'
                        : 'bg-bone-200/70 text-ink-600 hover:bg-bone-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Capacity" value={activeCapacity?.sub ?? ''}>
              <div className="grid grid-cols-3 gap-2">
                {CAPACITIES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setCapacity(option.id)}
                    aria-pressed={capacity === option.id}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                      capacity === option.id
                        ? 'border-ink-900 bg-ink-900/4'
                        : 'border-ink-900/10 hover:border-ink-900/30'
                    }`}
                  >
                    <span className="block text-sm font-medium text-ink-900">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-ink-400">{option.weight}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Fill level" value={`${Math.round(fill * 100)}%`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={fill}
                onChange={(event) => setFill(Number(event.target.value))}
                aria-label="Liquid fill level"
                className="w-full"
              />
              <div className="mt-2 flex justify-between text-xs text-ink-400">
                <button type="button" className="hover:text-ink-900" onClick={() => setFill(0)}>
                  Empty
                </button>
                <button type="button" className="hover:text-ink-900" onClick={() => setFill(1)}>
                  Full
                </button>
              </div>

              <AnimatePresence>
                {finish === 'chrome' && (
                  <motion.p
                    className="mt-3 text-xs leading-relaxed text-ink-400"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    Chrome is a solid steel shell, so the fill is hidden — switch to Gloss or
                    Frosted to watch it move.
                  </motion.p>
                )}
              </AnimatePresence>
            </Field>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
