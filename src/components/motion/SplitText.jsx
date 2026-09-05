import { motion, useReducedMotion } from 'framer-motion'

/**
 * Word-by-word masked reveal.
 *
 * Each word sits in its own overflow-hidden box and slides up from below the
 * mask, so the line assembles rather than fading in as a block. Reduced motion
 * gets a single fade with no travel.
 */
export default function SplitText({
  as: Tag = 'h2',
  text,
  className = '',
  delay = 0,
  stagger = 0.045,
}) {
  const reduced = useReducedMotion()
  const words = String(text).split(' ')

  if (reduced) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 0.3, delay }}
      >
        <Tag className={className}>{text}</Tag>
      </motion.div>
    )
  }

  return (
    <Tag className={className}>
      <motion.span
        className="inline"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
        transition={{ staggerChildren: stagger, delayChildren: delay }}
      >
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            // The mask has to clear the descenders and the line-height, or tall
            // glyphs get clipped as they arrive.
            className="inline-block overflow-hidden py-[0.12em] align-bottom"
          >
            <motion.span
              className="inline-block"
              variants={{
                hidden: { y: '110%' },
                visible: { y: 0 },
              }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {word}
              {i < words.length - 1 ? ' ' : ''}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  )
}
