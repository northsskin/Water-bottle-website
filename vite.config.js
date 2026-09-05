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
    // The built site lives in docs/ and is committed, because GitHub Pages is
    // serving this repository from a branch. A branch-served Pages site
    // publishes whatever is in the repo, so the *build output* has to be in the
    // repo — otherwise the browser is handed src/main.jsx as raw JSX. `/docs`
    // is the one sub-directory Pages will serve, so that is where it goes.
    outDir: 'docs',
    emptyOutDir: true,
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
