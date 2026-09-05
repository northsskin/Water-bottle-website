import { motion } from 'framer-motion'
import { PRODUCT } from '../product.js'

const LINKS = [
  { href: '#insulation', label: 'Features' },
  { href: '#customize', label: 'Customise' },
  { href: '#specs', label: 'Specs' },
]

export default function Nav() {
  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-40 pointer-events-none"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <a
          href="#hero"
          className="pointer-events-auto text-sm font-semibold tracking-[0.32em] text-ink-900"
        >
          {PRODUCT.brand}
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="pointer-events-auto text-sm text-ink-600 transition-colors hover:text-ink-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#final"
          className="pointer-events-auto rounded-full border border-ink-900/12 bg-bone-50/80 px-5 py-2 text-sm font-medium text-ink-900 backdrop-blur-md transition-colors hover:bg-bone-50"
        >
          $48
        </a>
      </div>
    </motion.header>
  )
}
