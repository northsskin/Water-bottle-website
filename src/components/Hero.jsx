import { motion, useReducedMotion } from 'framer-motion'
import { PRODUCT } from '../product.js'
import { useFocusTrigger } from '../hooks.js'
import { Icon } from './Icons.jsx'

export default function Hero() {
  const ref = useFocusTrigger('hero')
  const reduced = useReducedMotion()

  const rise = (delay) => ({
    initial: { opacity: 0, y: reduced ? 0 : 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduced ? 0.3 : 0.9, delay, ease: [0.22, 1, 0.36, 1] },
  })

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-[100svh] flex-col justify-between px-6 pb-10 pt-28 lg:px-10 lg:pb-14"
    >
      <div className="mx-auto w-full max-w-7xl text-center">
        <motion.p className="eyebrow" {...rise(0.15)}>
          Triple-insulated · 750 ml
        </motion.p>
        <motion.h1
          className="mt-4 text-[clamp(2.5rem,9vw,7rem)] font-medium leading-[0.92] tracking-[-0.04em] text-ink-900"
          {...rise(0.25)}
        >
          {PRODUCT.name}
        </motion.h1>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-8 md:grid-cols-3 md:items-end">
        <motion.p
          className="max-w-xs text-balance text-sm leading-relaxed text-ink-600 md:text-left"
          {...rise(0.45)}
        >
          {PRODUCT.tagline}
        </motion.p>

        <motion.div
          className="flex justify-start md:justify-center"
          {...rise(0.55)}
        >
          <a
            href="#buy"
            className="pointer-events-auto group inline-flex items-center gap-2 rounded-full bg-ink-900 px-7 py-3.5 text-sm font-medium text-bone-50 shadow-lift transition-transform duration-300 hover:-translate-y-0.5"
          >
            Add to cart — $48
            <Icon
              name="arrow"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            />
          </a>
        </motion.div>

        <motion.div
          className="flex items-center gap-3 text-xs text-ink-400 md:justify-end"
          {...rise(0.65)}
        >
          <span className="hidden h-px w-8 bg-bone-300 md:block" />
          {/* Orbiting is pointer-only — on touch the canvas lets scrolls through. */}
          <span className="hidden md:inline">Drag to inspect · scroll to explore</span>
          <span className="md:hidden">Scroll to explore</span>
        </motion.div>
      </div>
    </section>
  )
}
