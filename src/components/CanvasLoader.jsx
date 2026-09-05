import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * Cover for the lazily-loaded WebGL chunk.
 *
 * The scene builds its geometry procedurally, so there is nothing for drei's
 * `useProgress` to count — importing it here would also pull the whole 3D stack
 * into the main bundle, which is exactly what the lazy boundary is avoiding.
 * Instead the bar eases toward 90% while the chunk downloads and completes when
 * the renderer reports its first frame.
 */
export default function CanvasLoader({ ready }) {
  const [progress, setProgress] = useState(8)
  const [visible, setVisible] = useState(true)

  // Failsafe. The cover is a full-screen near-white panel, so if the renderer
  // never reports a first frame — a lost context, a driver that hands back a
  // dead canvas — it would sit there looking exactly like a broken blank page.
  // Uncovering a page whose bottle never arrived beats showing nothing at all.
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 15000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (ready) {
      setProgress(100)
      const t = setTimeout(() => setVisible(false), 520)
      return () => clearTimeout(t)
    }
    const id = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.16 + 1))
    }, 140)
    return () => clearInterval(id)
  }, [ready])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bone-100"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
        >
          <div className="relative h-12 w-12">
            <span className="absolute inset-0 rounded-full border border-bone-300" />
            <span className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-accent-500 [animation-duration:1.1s]" />
          </div>

          <p className="mt-6 eyebrow">Preparing the studio</p>

          <div className="mt-3 h-px w-44 overflow-hidden bg-bone-300">
            <motion.div
              className="h-full bg-ink-900"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-3 text-xs tabular-nums text-ink-400">{Math.round(progress)}%</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
