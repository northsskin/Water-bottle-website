import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative asset URLs, so the build works wherever it is served from — the
  // domain root, a GitHub Pages project sub-path
  // (user.github.io/Water-bottle-website/), or a custom domain — without
  // hardcoding the repository name. The page has no client-side routing, so
  // there is nothing that needs an absolute base.
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Keep the (large) 3D stack in its own chunk so the page shell paints
        // before the WebGL bundle finishes downloading.
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
})
