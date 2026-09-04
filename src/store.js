import { create } from 'zustand'
import { COLORS } from './product.js'

/**
 * Single source of truth shared by the DOM sections and the 3D scene.
 *
 * Values the render loop reads every frame (focus, interaction) are pulled with
 * `useConfig.getState()` inside `useFrame` rather than subscribed to, so moving
 * the camera never re-renders React.
 */
export const useConfig = create((set) => ({
  color: COLORS[0].hex,
  finish: 'gloss',
  capacity: 750,
  fill: 0.72,

  /** Which part of the bottle the camera is looking at. See CAMERA_POSES. */
  focus: 'hero',
  /** True while the pointer is on OrbitControls, plus a short cooldown. */
  interacting: false,

  setColor: (color) => set({ color }),
  setFinish: (finish) => set({ finish }),
  setCapacity: (capacity) => set({ capacity }),
  setFill: (fill) => set({ fill }),
  setFocus: (focus) => set((s) => (s.focus === focus ? s : { focus })),
  setInteracting: (interacting) => set({ interacting }),
}))
