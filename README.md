# AQUEM · Vessel One

A single-page product site for a fictional insulated water bottle. The bottle is
modelled procedurally in the browser with react-three-fiber — there is no GLTF,
no HDRI download, and no image asset anywhere in the project.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview
```

## Stack

React 19 · Vite 7 · react-three-fiber 9 + drei 10 · three 0.185 · Tailwind CSS 4
· Framer Motion 12 · Zustand 5.

## How it fits together

```
src/
  App.jsx              page shell: fixed canvas layer + scrolling sections
  store.js             shared config (colour/finish/capacity/fill) + camera focus
  product.js           all copy and product data
  hooks.js             scroll-focus observer, media queries
  components/          Nav, Hero, Features, Customize, Specs, Footer, Reveal, …
  three/
    Experience.jsx     <Canvas>, studio lighting, contact shadow, camera rig
    Bottle.jsx         the model: geometry, materials, fill animation
    bottleProfile.js   the bottle's dimensions and lathe profiles
    poses.js           the camera choreography
```

### The bottle

`bottleProfile.js` defines the product as a set of radius-vs-height functions,
which `Bottle.jsx` samples into `LatheGeometry`: the shell (base fillet →
tapered barrel → raised-cosine shoulder → neck), the cavity the liquid fills,
and the cap crown. Grip ridges, the gasket and the pull ring are small torii on
top. The wrap-around label is drawn into a `CanvasTexture` and repainted when
the capacity or colour changes — it flips between light and dark artwork so it
stays legible on every shell colour.

Lighting is a studio softbox rig built from drei `<Lightformer>`s baked into an
`<Environment>` map, plus three point lights for crisp speculars and a
`<ContactShadows>` plane for the ground shadow. Because the environment is
generated from the scene, nothing is fetched at runtime.

### The fill level

The liquid is a second lathe of the inner profile, cut off by a **world-space
clipping plane** whose constant is eased toward the target height each frame —
so the level animates without rebuilding geometry. A bright disc rides on the
plane as the waterline.

One non-obvious constraint drove the material choices: three.js builds the
backdrop for a transmissive material from the **opaque** render list only. A
transparent or transmissive liquid is therefore invisible through a transmissive
shell. The liquid is opaque and gets its watery quality from the shell
refracting it plus a fresnel rim patched into the emissive term via
`onBeforeCompile`. This also means the Chrome finish (no transmission) genuinely
hides the fill, which the configurator says out loud.

### The camera

`poses.js` holds one pose per section — hero, four feature details, customize,
specs, CTA. An `IntersectionObserver` on each block reports which one is in the
middle band of the viewport (`hooks.js`), the store records it, and `CameraRig`
eases the camera and orbit target toward that pose every frame.

Two details worth knowing:

- **`offset` moves the camera, not the bottle.** It is a fraction of the
  viewport width, applied along the camera's right vector to both position and
  target. The bottle lands in the empty half of the two-column layout at any
  aspect ratio while the framing stays exactly as authored.
- **Pose heights scale with capacity.** A 1 L bottle is 12% taller, so the y
  components ride along with it — otherwise the cap close-up would frame empty
  space.

Dragging takes over from the scroll choreography and holds for 1.8 s after
release. Wheel-zoom is disabled on purpose: the canvas is full-bleed behind the
page, so the wheel belongs to the document.

### Responsive behaviour

On phones the poses are replaced with gentler, pulled-back framings and the
lateral offset is dropped, since there is no second column. `OrbitControls` is
not mounted at all and the canvas takes no pointer events — three.js sets
`touch-action: none` on connect, which would otherwise swallow page scrolling.
Text that would sit on top of the bottle gets a frosted card (`components/ui.js`)
that dissolves at the `md` breakpoint.

### Performance

The whole 3D stack is behind `React.lazy` in its own chunk, with `<Suspense>`
boundaries outside and inside the `<Canvas>`, so the page shell paints while it
downloads; `CanvasLoader` covers the gap and clears on the renderer's first
frame. Pixel ratio is capped at 2 (1.5 on mobile), the environment map renders
once, and per-frame work reads the store with `getState()` so animating the
camera never re-renders React. `prefers-reduced-motion` stops the idle rotation
and shortens the scroll reveals.

A `SceneBoundary` error boundary keeps the page usable if WebGL is unavailable.

## Deployment

`.github/workflows/deploy.yml` builds the site and publishes `dist/` to GitHub
Pages.

**One manual step is required: set Settings → Pages → Source to "GitHub
Actions."** "Deploy from a branch" publishes the repository as-is, which hands
the browser `src/main.jsx` as raw JSX and renders a blank page. Worse, that
pipeline keeps running *alongside* this workflow on every push, and whichever
finishes last is what visitors get — so the site flips between working and
blank at random. Only a repo admin can change this: the Actions token is
refused (403) on the Pages config endpoint, so the workflow can only warn.

Until it is switched, the deploy job sleeps 90s so the branch pipeline finishes
first and this build is the one that survives. **Delete that step once the
source is set to GitHub Actions** — it is a stopgap, not a design.

`base` is `'./'`, so the build is location-agnostic: it works at a domain root,
at a project sub-path like `user.github.io/Water-bottle-website/`, or behind a
custom domain, with no repository name hardcoded anywhere.

## Notes

Content, pricing and brand are invented for the demo; the "Add to cart" buttons
are deliberately inert.
