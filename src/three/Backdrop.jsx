import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Paints the studio background into the scene itself rather than relying on a
 * transparent canvas over a CSS gradient.
 *
 * The effect composer renders to an opaque buffer, so a see-through canvas comes
 * out black the moment post-processing is switched on. Giving the scene its own
 * background makes the frame complete before the effects touch it — and a
 * vignette only reads as studio lighting if there is something there to darken.
 */
export default function Backdrop() {
  const scene = useThree((s) => s.scene)

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    // Matches the bone palette the page is built from, so the canvas and the
    // DOM either side of it are the same material.
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.45, '#f4f2ed')
    gradient.addColorStop(1, '#e4e0d7')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 256)

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  useEffect(() => {
    const previous = scene.background
    scene.background = texture
    return () => {
      scene.background = previous
      texture.dispose()
    }
  }, [scene, texture])

  return null
}
