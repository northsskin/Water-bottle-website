import { create } from 'zustand'
import { COLORS } from './product.js'

/**
 * Single source of truth shared by the DOM sections and the 3D scene.
 *
 * Read with `useConfig.getState()` inside `useFrame` rather than subscribed to,
 * so the render loop never re-renders React. Scroll-derived values live in
 * `scroll/scrollState.js`; this store is only the product configuration.
 */
export const useConfig = create((set) => ({
  color: COLORS[0].hex,
  finish: 'gloss',
  capacity: 750,
  fill: 0.72,

  setColor: (color) => set({ color }),
  setFinish: (finish) => set({ finish }),
  setCapacity: (capacity) => set({ capacity }),
  setFill: (fill) => set({ fill }),
}))
