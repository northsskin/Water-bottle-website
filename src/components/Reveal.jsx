import { motion, useReducedMotion } from 'framer-motion'

/**
 * Scroll-triggered fade/slide-in. Honours prefers-reduced-motion by fading in
 * place instead of travelling.
 */
export default function Reveal({ children, delay = 0, y = 24, className = '', ...rest }) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: reduced ? 0.2 : 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
