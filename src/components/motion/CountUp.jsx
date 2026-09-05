import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

/**
 * Counts a stat up when it scrolls into view, preserving whatever prefix or
 * suffix the source string carries ("24 h", "68 mm", "90%", "1/4").
 *
 * Strings with no leading number are rendered untouched, so the same component
 * can wrap every stat without the caller having to care.
 */
export default function CountUp({ value, duration = 1.1, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const reduced = useReducedMotion()

  const parsed = String(value).match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/s)
  // Only count things that read as quantities. "1/4 turn" counting up from zero
  // spends most of the animation showing "0/4", which is simply wrong.
  const match = parsed && parseFloat(parsed[2]) >= 10 ? parsed : null
  const [display, setDisplay] = useState(() => (match && !reduced ? `${match[1]}0${match[3]}` : value))

  useEffect(() => {
    if (!match || reduced) {
      setDisplay(value)
      return
    }
    if (!inView) return

    const [, prefix, digits, suffix] = match
    const end = parseFloat(digits)
    const decimals = (digits.split('.')[1] ?? '').length
    const start = performance.now()
    let frame = 0

    const tick = (now) => {
      const t = Math.min((now - start) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(`${prefix}${(end * eased).toFixed(decimals)}${suffix}`)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, value, duration, reduced, match])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}
