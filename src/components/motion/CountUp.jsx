import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

/**
 * Counts a stat up when it scrolls into view, preserving whatever prefix or
 * suffix the source string carries ("24 h", "68 mm", "90%").
 *
 * Two things keep it from reading as a flicker. It only ever shows about a
 * dozen values — updating every frame turns "68 mm" into an unreadable blur of
 * digits — and it eases out hard, so most of the count is over quickly and it
 * settles on the real number rather than crawling towards it.
 *
 * Strings with no leading number, or numbers small enough that counting is
 * silly ("1/4 turn" spends most of the animation reading "0/4"), are rendered
 * untouched.
 */
const STEPS = 12
// Starts a little over half way rather than at zero. Counting "68 mm" up from
// nothing spends its first frames reading "0 mm" and "2 mm", which is what the
// old version looked like it was doing — a number churning, not a stat landing.
const START = 0.55
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)

export default function CountUp({ value, duration = 1.1, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const reduced = useReducedMotion()

  const parsed = String(value).match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/s)
  const match = parsed && parseFloat(parsed[2]) >= 10 ? parsed : null

  const [display, setDisplay] = useState(() => {
    if (!match || reduced) return value
    const seed = parseFloat(match[2]) * START
    const decimals = (match[2].split('.')[1] ?? '').length
    return `${match[1]}${seed.toFixed(decimals)}${match[3]}`
  })

  useEffect(() => {
    if (!match || reduced) {
      setDisplay(value)
      return
    }
    if (!inView) return

    const [, prefix, digits, suffix] = match
    const end = parseFloat(digits)
    const decimals = (digits.split('.')[1] ?? '').length

    let step = 0
    const id = setInterval(() => {
      step += 1
      const t = step / STEPS
      const shown = step >= STEPS ? end : end * (START + (1 - START) * easeOutQuart(t))
      setDisplay(`${prefix}${shown.toFixed(decimals)}${suffix}`)
      if (step >= STEPS) clearInterval(id)
    }, (duration * 1000) / STEPS)

    return () => clearInterval(id)
  }, [inView, value, duration, reduced, match])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}
