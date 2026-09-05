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
· Framer Motion 12 · Zustand 5 · Lenis · postprocessing.

## How it fits together

```
src/
  App.jsx              page shell: fixed canvas layer + scrolling sections
  store.js             product configuration (colour/finish/capacity/fill)
  product.js           all copy and product data
  scroll/
    scrollState.js     the scroll clock: playhead, section progress, velocity
    sections.js        section registry; turns scroll position into a playhead
    useSmoothScroll.js Lenis, plus page progress and velocity
  three/
    Experience.jsx     <Canvas>, lighting, quality tier, effect composer
    timeline.js        the camera flight: one keyframe per story section
    CameraRig.jsx      samples the flight path; drag as an additive offset
    Intro.jsx          the opening shot
    quality.js         the three quality tiers and the runtime demotion
    Bottle.jsx         composes the parts; capacity scale and scroll-driven spin
    parts/             Shell, Liquid (pour + slosh), CapAssembly (explode)
    bottleProfile.js   the bottle's dimensions and lathe profiles
  components/
    motion/            SplitText, CountUp, ProgressRail
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

Scroll position is the playhead. `scroll/sections.js` measures where each story
section's centre sits in the document and turns the scroll offset into
`scrollState.u` — a float index into the section list, so `u = 2` means "section
2 is dead centre". `timeline.js` holds one keyframe per section and samples them
off a Catmull-Rom spline at that index, which passes exactly through each
authored pose while shaping the travel between. The camera is therefore always
moving with the wheel rather than easing toward a destination.

Details worth knowing:

- **`offset` moves the camera, not the bottle.** It is a fraction of the
  viewport width, applied along the camera's right vector to both position and
  target. The bottle lands in the empty half of the two-column layout at any
  aspect ratio while the framing stays exactly as authored.
- **Pose heights scale with capacity.** A 1 L bottle is 12% taller, so the y
  components ride along with it — otherwise the cap close-up would frame empty
  space.
- **`spin` climbs monotonically across the page**, so scrolling turns the
  product about one full revolution top to bottom.
- **Dragging is additive.** It accumulates an angular offset that is added to
  whatever the scroll is pointing at, then decays back to zero, so the two
  compose instead of fighting. The canvas is `touch-action: pan-y`, which leaves
  vertical scrolling to the browser and gives sideways gestures to the rig —
  that is what makes the bottle inspectable on a phone without eating the page
  scroll.

### The set pieces

Two sections pin (`position: sticky` inside a 220vh runway) and scrub their
animation against their own progress:

- **Exploded cap** (`parts/CapAssembly.jsx`) — crown, gasket and pull ring come
  apart by different distances while the crown unscrews, hold, then reseat. Each
  callout is parented to its part so labels track rather than point at where a
  piece used to be. The opening sequence drives the same rig backwards.
- **Pour** (`parts/Liquid.jsx`) — the level drains then refills past where it
  started, and the clipping plane's *normal* is sprung off scroll velocity, so
  the waterline tilts and rocks back. The surface disc reorients into the plane,
  because a tilted waterline with a flat lid inside it looks wrong immediately.

### The opening

`three/Intro.jsx` owns the camera for 3.6 s: it pushes in from a low wide angle
while tone-mapping exposure comes up out of black, and the cap descends and
screws on as the bottle fills. Any scroll, key or the Skip control cuts to the
end; `prefers-reduced-motion` never starts it.

### Responsive behaviour

On phones the keyframes are replaced with gentler, pulled-back framings and the
lateral offset is dropped, since there is no second column. The pinned set
pieces aim *below* the action so it plays in the upper half of the screen, and
their copy cards pin to the bottom rather than centring — otherwise the card
would sit squarely on top of the thing it is describing. Text that would
overlap the bottle gets a frosted card (`components/ui.js`) that dissolves at
the `md` breakpoint, and the cap callouts are dropped entirely, since a phone
has no room for a leader line and a label.

Dragging works on touch: the canvas is `touch-action: pan-y`, so the browser
keeps vertical scrolling and the rig only receives sideways gestures. (The
previous build used `OrbitControls`, which sets `touch-action: none` on connect
and would have swallowed the page scroll — that is why it was desktop-only.)

### Performance

`three/quality.js` defines three tiers. The starting tier is guessed from core
count, device memory and pixel density; drei's `<PerformanceMonitor>` then
demotes at runtime if the guess was optimistic. Demotion is deliberately
one-way — promoting on a good stretch would let settings flicker as you scroll.

|  | high | medium | low / mobile |
|---|---|---|---|
| DPR | 2 | 1.5 | 1 |
| Bloom + vignette | yes | yes | no |
| Depth of field | yes | no | no |
| Caustics | yes | no | no |
| Transmission pass | full res | 0.7× | 0.5× |
| Contact shadow | 512 | 256 | 256, one frame |

Transmission is the expensive one — it renders the whole scene again every
frame — but switching it off costs the liquid, which is the product. The bottom
tier shrinks that pass to a quarter of the pixels instead; through a refracting
wall nobody can tell.

The 3D stack is behind `React.lazy` in its own chunk with `<Suspense>` either
side of the `<Canvas>`, so the page shell paints while it downloads. Per-frame
work reads plain objects (`scrollState`, `useConfig.getState()`) rather than
React state, so nothing in the render loop re-renders the page. A
`SceneBoundary` error boundary keeps the page usable if WebGL is unavailable.

**Diagnostics**: append `?stats` for a frame-rate, draw-call and tier readout,
and `?tier=low|medium|high` to pin a tier and compare them. Draw calls and
triangle counts are the honest measure of whether a tier is cheaper — frame rate
hides behind vsync until the moment it collapses.

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
