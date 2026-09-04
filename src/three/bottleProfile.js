import * as THREE from 'three'

/**
 * Every dimension of the bottle, in world units (1 unit ≈ 10 cm).
 * The whole model is a set of lathed profiles derived from these numbers, so
 * there is no GLTF to download.
 */
export const BOTTLE = {
  baseFillet: 0.08,
  bodyTop: 1.42,
  shoulderTop: 1.84,
  neckTop: 2.02,
  rBody: 0.44,
  rNeck: 0.17,
  wall: 0.038,

  capBottom: 1.86,
  capShoulder: 2.16,
  capTop: 2.24,
  rCap: 0.198,

  labelCenter: 0.95,
  labelHeight: 0.54,

  fillMin: 0.07,
  fillMax: 1.7,
}

/** Outer radius of the shell at height `y`. */
export function outerRadius(y) {
  const { baseFillet, bodyTop, shoulderTop, neckTop, rBody, rNeck } = BOTTLE
  if (y <= 0) return 0
  if (y < baseFillet) {
    const d = baseFillet - y
    return rBody - baseFillet + Math.sqrt(Math.max(baseFillet * baseFillet - d * d, 0))
  }
  if (y <= bodyTop) {
    // A 2% taper keeps the silhouette from reading as a plain extruded tube.
    return rBody * (1 - 0.02 * ((y - baseFillet) / (bodyTop - baseFillet)))
  }
  if (y <= shoulderTop) {
    const t = (y - bodyTop) / (shoulderTop - bodyTop)
    // Raised cosine: tangent to the barrel at the bottom and to the neck at the
    // top, which is what makes the shoulder read as rounded rather than conic.
    const e = 0.5 + 0.5 * Math.cos(Math.PI * t)
    return rNeck + (rBody * 0.98 - rNeck) * e
  }
  if (y <= neckTop) return rNeck
  return 0
}

/** Inner radius of the cavity — the surface the liquid mesh is lathed from. */
export function innerRadius(y) {
  return Math.max(outerRadius(y) - BOTTLE.wall, 0.02)
}

/** Outer radius of the cap at height `y`. */
export function capRadius(y) {
  const { capBottom, capShoulder, capTop, rCap } = BOTTLE
  if (y < capBottom || y > capTop) return 0
  if (y <= capShoulder) return rCap
  const t = (y - capShoulder) / (capTop - capShoulder)
  // Quarter-round crown.
  return rCap * Math.sqrt(Math.max(1 - t * t, 0))
}

/**
 * Samples `radiusFn` between two heights into a lathe profile.
 * `closeBottom` adds a point on the axis so the solid gets a floor.
 */
export function profilePoints(y0, y1, radiusFn, segments = 96, closeBottom = true) {
  const points = []
  if (closeBottom) points.push(new THREE.Vector2(0, y0))
  for (let i = 0; i <= segments; i++) {
    const y = y0 + ((y1 - y0) * i) / segments
    points.push(new THREE.Vector2(Math.max(radiusFn(y), 0.0005), y))
  }
  return points
}

/** Maps the 0–1 fill slider onto a height in bottle-local space. */
export function fillHeight(fill) {
  const t = THREE.MathUtils.clamp(fill, 0, 1)
  return THREE.MathUtils.lerp(BOTTLE.fillMin, BOTTLE.fillMax, t)
}

/** Perceived brightness of a `#rrggbb` string, 0–1. */
function relativeLuminance(hex) {
  const value = parseInt(hex.replace('#', ''), 16)
  const r = ((value >> 16) & 255) / 255
  const g = ((value >> 8) & 255) / 255
  const b = (value & 255) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Paints the wrap-around label into a canvas texture. Regenerated when the
 * capacity changes so the printed volume always matches the configurator.
 */
export function createLabelTexture(brand, model, capacityLabel, shellHex = '#8ea28c') {
  const width = 2048
  const height = 512
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, width, height)

  // Artwork occupies the front third of the wrap; the rest stays transparent so
  // the bare shell shows through, like a real applied label.
  const cx = width * 0.5
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Flip the artwork between light and dark so it stays legible on every shell
  // colour the configurator offers.
  const light = relativeLuminance(shellHex) < 0.72
  const ink = light ? '255,255,255' : '20,22,26'

  ctx.fillStyle = `rgba(${ink},0.94)`
  ctx.font = '600 132px Inter, Helvetica, Arial, sans-serif'
  ctx.letterSpacing = '38px'
  ctx.fillText(brand, cx + 19, height * 0.42)

  ctx.fillStyle = `rgba(${ink},0.7)`
  ctx.font = '500 40px Inter, Helvetica, Arial, sans-serif'
  ctx.letterSpacing = '14px'
  ctx.fillText(`${model.toUpperCase()} · ${capacityLabel.toUpperCase()}`, cx + 7, height * 0.66)

  ctx.strokeStyle = `rgba(${ink},0.5)`
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx - 190, height * 0.55)
  ctx.lineTo(cx + 190, height * 0.55)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}
