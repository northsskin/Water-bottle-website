import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { scrollState } from '../scroll/scrollState.js'

/**
 * Frame-rate and scene-cost readout, mounted only for `?stats`.
 *
 * Draw calls and triangle count are the honest measures of whether a quality
 * tier is actually cheaper — frame rate alone hides behind vsync until the
 * moment it collapses. Also publishes to `window.__stats` so an automated pass
 * can assert the tiers really do shed work.
 */
export default function Stats({ quality }) {
  const { gl } = useThree()
  const node = useRef(null)
  const acc = useRef({ frames: 0, time: 0, fps: 0 })

  // Transmission and the effect composer each render the scene again, and
  // `gl.info` resets on every one of those passes — left alone it would report
  // only the composer's final fullscreen quad. Accumulate instead, and reset
  // once per frame, so the numbers are the true per-frame cost.
  useEffect(() => {
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])

  useEffect(() => {
    const el = document.createElement('div')
    el.style.cssText =
      'position:fixed;left:12px;bottom:12px;z-index:60;font:11px ui-monospace,monospace;' +
      'background:rgba(20,22,26,.82);color:#e8f4ff;padding:8px 10px;border-radius:8px;' +
      'white-space:pre;pointer-events:none;line-height:1.5'
    document.body.appendChild(el)
    node.current = el
    return () => {
      el.remove()
      node.current = null
    }
  }, [])

  useFrame((_, delta) => {
    const a = acc.current
    a.frames += 1
    a.time += delta
    if (a.time < 0.5) {
      gl.info.reset()
      return
    }

    a.fps = a.frames / a.time
    a.frames = 0
    a.time = 0

    const info = gl.info
    const stats = {
      fps: Math.round(a.fps),
      calls: info.render.calls,
      triangles: info.render.triangles,
      programs: info.programs?.length ?? 0,
      textures: info.memory.textures,
      geometries: info.memory.geometries,
      tier: quality.name,
      dpr: gl.getPixelRatio(),
    }
    window.__stats = stats
    window.__scroll = scrollState

    gl.info.reset()

    if (node.current) {
      node.current.textContent =
        `${stats.fps} fps   tier ${stats.tier}   dpr ${stats.dpr}\n` +
        `${stats.calls} calls   ${stats.triangles.toLocaleString()} tris\n` +
        `${stats.textures} tex   ${stats.geometries} geo   ${stats.programs} programs`
    }
  })

  return null
}
