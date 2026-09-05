# AQUEM · Vessel One

A single-page product site for a fictional insulated water bottle. The bottle is
modelled procedurally in the browser with react-three-fiber — there is no GLTF,
no HDRI download, and no image asset anywhere in the project.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> docs/  (committed; see Deployment)
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
animation against their own progress — measured across the *pinned* window
(`['start start', 'end end']`), not the whole travel through the viewport. With
the default range, progress 0→1 spans the section entering and leaving, so most
of a set piece plays while it is still sliding into view and the opening beats
are over before the card ever pins.

- **Exploded cap** (`parts/CapAssembly.jsx`) — crown, gasket and pull ring come
  apart by different distances while the crown unscrews, hold, then reseat. Each
  callout is parented to its part so labels track rather than point at where a
  piece used to be. The opening sequence drives the same rig backwards.
- **Pour** (`pour.js`, `PourScene.jsx`) — the cap lifts clear, the bottle tips
  about *its own lip* and carries it over a tumbler, and water falls into the
  glass while the bottle drains and the glass fills. One choreography in
  `pour.js` drives the bottle, the cap, the stream, the glass and the splash, so
  they cannot disagree about whether water is currently in the air.

  The stream is a plain unit cylinder that the vertex shader sweeps along a
  quadratic Bézier each frame — that curve is a parabola, which is the path the
  water actually takes, and it costs two uniforms rather than a TubeGeometry
  rebuilt per frame. Its profile narrows towards the bottom because a falling
  stream accelerates and the same volume per second has to fit through less
  cross-section.

  Sweeping in the shader is also what makes it *shade* like water. An earlier
  version displaced the positions and left the normals cylindrical, so the
  bulges travelling down the stream moved the silhouette but never caught the
  light, and it read as a flat band of colour. Here the frame is rebuilt per
  vertex and the normal comes from it, including the slope of the radius, so
  there is a highlight running down the column.

  Two staging details matter as much as the shading. The stream starts at the
  **lowest point of the rim**, not at `MOUTH_LOCAL` — that point is the centre
  of the neck opening and sits on the spin axis, which is the right place to
  pivot about and the wrong place to start a stream: water born there appears
  to begin behind the neck and cross over it. And it does not fade in as a
  whole; `flowOn` drops the head from the lip to the glass and `flowOff` drains
  the tail downward, because thinning the entire rod at once is what reads as
  an object being scaled.

  The splash is one InstancedMesh of ballistic droplets that respawn at the
  impact point, so it sustains while water lands rather than firing once. Each
  is stretched along its own velocity: a sphere moving quickly reads as a bead
  floating in the drink, while the same volume drawn into a streak reads as
  spray.

  Both levels are solved through **volume**, not height. The bottle is a wide
  barrel and the glass a narrow taper, so the same volume is a very different
  number of millimetres in each; lerping heights independently makes the water
  appear and disappear rather than move. `pour.js` integrates π r² dy up each
  vessel once, then converts a single "poured" driver into a height in each
  through those tables. The glass runs a fraction behind the bottle, because the
  water it is gaining is still in the air.

  Pivoting about the lip rather than the base is the whole trick: rotating a
  22cm bottle about its base swings the mouth a metre sideways and reads as
  toppling over. The pour staging also sits *above* the spin in the hierarchy —
  below it, the page's scroll-driven rotation turns the staging itself and walks
  the lip off the glass mid-pour. For the same reason the cap's exit offset is
  authored in view space and then un-spun before it is applied: it lives inside
  the rotation, so "towards the camera" becomes "behind the bottle" once the
  page has turned the bottle 150°.

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

`npm run build` writes to `docs/`, and `docs/` is committed.
`.github/workflows/deploy.yml` then publishes it **both ways at once**: it
uploads `docs/` as a Pages artifact and deploys it, and it commits `docs/` back
to the branch if it ever drifts from the source. Whichever Source the repository
is set to, the thing Pages serves is the built site.

That belt-and-braces shape was arrived at the hard way, and it is deliberate.
The Source setting was moved three times in one day, and each position fails
differently:

| Settings → Pages → Source | What happens without this setup |
|---|---|
| GitHub Actions | fine — the workflow publishes |
| Deploy from a branch, `/docs` | Jekyll crashes: `No such file or directory - /github/workspace/docs` |
| Deploy from a branch, `/` (root) | serves the repo as-is, hands the browser `src/main.jsx` as raw JSX → blank page |

A branch-served site publishes the repository as-is and cannot build a Vite app,
so the artifact has to already be in the repository. And nothing in a workflow
can force the setting to Actions instead: the Actions token gets a 403 on the
Pages config endpoint, so a workflow cannot even *read* which route is live.
Worse, while the source was a branch, both pipelines published on every push and
the last writer won — so the site flipped between working and blank at random.

Committing the build closes all of it, because there is no longer a version of
the repository that is worth publishing but wrong. As of the last deploy the
source is "GitHub Actions" (`actions/deploy-pages` succeeded and no branch
pipeline ran), but nothing depends on it staying there.

Two details make it work —

- **`docs/.nojekyll`** (copied from `public/`) turns Jekyll off, so Pages copies
  the files across instead of trying to render them. Without it, Jekyll skips
  every directory beginning with an underscore and mangles the rest.
- **`base` is `'./'`**, so the build is location-agnostic: it works at a domain
  root, at a project sub-path like `user.github.io/Water-bottle-website/`, or
  behind a custom domain, with no repository name hardcoded anywhere.

The artifact-upload and deploy steps are marked `continue-on-error`: when the
source is a branch they have nothing to deploy to, and that should read as "not
this route today", not as a failed build.

Root-folder branch source is the one position still not covered — it serves the
unbuilt `index.html`, and no workflow can reach it. If the site ever goes blank
again, that is what happened: `index.html` watches for its own entry script
failing to load, which can only happen when the source is being served raw, and
renders a short page naming the setting to change.

One trap worth knowing if you touch the build: **Tailwind skips gitignored files
when it scans for class names, and `docs/` is deliberately not gitignored.** Left
alone it harvests class-like strings out of the previous build's bundle and emits
a slightly larger stylesheet every time — which also rehashes the entry chunk, so
the workflow's drift check would commit on every push. `@source not '../docs'` in
`src/index.css` closes that loop; two consecutive builds are byte-identical.

**Committing build output is not normally good practice**, and it is worth being
plain about why it is here: a branch-served Pages site has no build step, so the
artifact has to live in the repo or there is no site. The workflow's rebuild-and-
commit step is what keeps it honest — `docs/` cannot silently fall behind `src/`.

## Notes

Content, pricing and brand are invented for the demo; the "Add to cart" buttons
are deliberately inert.
